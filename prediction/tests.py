import json
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from .ml_engine import get_feature_columns
from .models import Prediction

User = get_user_model()


def make_prediction(user, **kwargs):
    defaults = dict(amount=10.0, features_json="{}", probability=0.1, risk_level="LOW", is_fraud=False)
    defaults.update(kwargs)
    return Prediction.objects.create(user=user, **defaults)


class ApiAuthTests(TestCase):
    def test_api_requires_login(self):
        for url in [
            "/prediction/api/history/",
            "/prediction/api/export-csv/",
            "/analytics/api/dashboard/",
            "/analytics/api/analytics/",
        ]:
            self.assertEqual(self.client.get(url).status_code, 401, url)
        self.assertEqual(self.client.post("/prediction/api/predict/", {}).status_code, 401)

    def test_login_logout_flow(self):
        User.objects.create_user("alice", password="s3cret-pass")
        res = self.client.post("/accounts/api/login/", json.dumps({"username": "alice", "password": "wrong"}), content_type="application/json")
        self.assertEqual(res.status_code, 401)
        res = self.client.post("/accounts/api/login/", json.dumps({"username": "alice", "password": "s3cret-pass"}), content_type="application/json")
        self.assertTrue(res.json()["authenticated"])
        self.assertTrue(self.client.get("/accounts/api/user/").json()["authenticated"])
        self.client.post("/accounts/api/logout/")
        self.assertFalse(self.client.get("/accounts/api/user/").json()["authenticated"])

    def test_csrf_enforced_for_json_posts(self):
        from django.test import Client
        client = Client(enforce_csrf_checks=True)
        User.objects.create_user("bob", password="pw-12345678")
        client.login(username="bob", password="pw-12345678")
        res = client.post("/prediction/api/predict/", json.dumps({"amount": 5}), content_type="application/json")
        self.assertEqual(res.status_code, 403)


TEST_MEDIA_ROOT = tempfile.mkdtemp(prefix="fraudshield-test-media-")


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class PredictionApiTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.user = User.objects.create_user("analyst", password="pw-12345678")
        self.other = User.objects.create_user("other", password="pw-12345678")
        self.client.force_login(self.user)

    def test_predict_is_consistent_and_saved(self):
        res = self.client.post("/prediction/api/predict/", json.dumps({"amount": 120.5, "time_value": 100, "merchant": "Shop"}), content_type="application/json")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["is_fraud"], data["probability"] >= 50)
        expected_risk = "HIGH" if data["probability"] >= 70 else "MEDIUM" if data["probability"] >= 30 else "LOW"
        self.assertEqual(data["risk_level"], expected_risk)
        pred = Prediction.objects.get(pk=data["id"])
        self.assertEqual(pred.merchant, "Shop")
        self.assertEqual(pred.user, self.user)

    def test_predict_rejects_bad_input(self):
        res = self.client.post("/prediction/api/predict/", json.dumps({"amount": "abc"}), content_type="application/json")
        self.assertEqual(res.status_code, 400)
        res = self.client.post("/prediction/api/predict/", json.dumps({"amount": -1}), content_type="application/json")
        self.assertEqual(res.status_code, 400)

    def test_upload_csv(self):
        header = ",".join(get_feature_columns())
        rows = "\n".join(",".join(["0"] * 29 + [str(10 * (i + 1))]) for i in range(5))
        upload = SimpleUploadedFile("batch.csv", f"{header}\n{rows}\n".encode(), content_type="text/csv")
        res = self.client.post("/prediction/api/upload/", {"csv_file": upload})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_rows"], 5)
        self.assertEqual(Prediction.objects.filter(user=self.user, source="csv_upload").count(), 5)
        self.assertEqual(self.client.get(data["download_url"]).status_code, 200)

    def test_upload_rejects_non_csv(self):
        upload = SimpleUploadedFile("notes.txt", b"hello", content_type="text/plain")
        self.assertEqual(self.client.post("/prediction/api/upload/", {"csv_file": upload}).status_code, 400)

    def test_history_is_private_paginated_and_filtered(self):
        for i in range(12):
            make_prediction(self.user, amount=i, is_fraud=i % 3 == 0, risk_level="HIGH" if i % 3 == 0 else "LOW")
        make_prediction(self.other, amount=999)

        data = self.client.get("/prediction/api/history/?page_size=5&page=3").json()
        self.assertEqual(data["total_count"], 12)
        self.assertEqual(data["total_pages"], 3)
        self.assertEqual(len(data["results"]), 2)

        self.assertEqual(self.client.get("/prediction/api/history/?outcome=fraud").json()["total_count"], 4)
        self.assertEqual(self.client.get("/prediction/api/history/?risk=HIGH").json()["total_count"], 4)
        self.assertEqual(self.client.get("/prediction/api/history/?q=999").json()["total_count"], 0)

        target = Prediction.objects.filter(user=self.user).first()
        res = self.client.get(f"/prediction/api/history/?q={target.transaction_code}").json()
        self.assertEqual([r["id"] for r in res["results"]], [target.id])

    def test_flag_and_delete_only_own_predictions(self):
        mine = make_prediction(self.user)
        theirs = make_prediction(self.other)

        res = self.client.post(f"/prediction/api/history/{mine.id}/flag/")
        self.assertTrue(res.json()["flagged"])
        self.assertEqual(self.client.get("/prediction/api/history/?flagged=1").json()["total_count"], 1)

        self.assertEqual(self.client.post(f"/prediction/api/history/{theirs.id}/flag/").status_code, 404)
        self.assertEqual(self.client.post(f"/prediction/api/history/{theirs.id}/delete/").status_code, 404)
        self.assertTrue(Prediction.objects.filter(pk=theirs.id).exists())

        self.assertEqual(self.client.post(f"/prediction/api/history/{mine.id}/delete/").status_code, 200)
        self.assertFalse(Prediction.objects.filter(pk=mine.id).exists())

    def test_export_csv_streams_filtered_rows(self):
        make_prediction(self.user, amount=1, is_fraud=True, risk_level="HIGH", probability=0.9)
        make_prediction(self.user, amount=2)
        res = self.client.get("/prediction/api/export-csv/?outcome=fraud")
        lines = b"".join(res.streaming_content).decode().strip().splitlines()
        self.assertEqual(len(lines), 2)
        self.assertIn("Fraud", lines[1])

    def test_clear_history(self):
        make_prediction(self.user)
        make_prediction(self.other)
        self.assertEqual(self.client.post("/prediction/api/history/clear/").json()["deleted"], 1)
        self.assertEqual(Prediction.objects.count(), 1)

    def test_dashboard_and_analytics(self):
        make_prediction(self.user, amount=50, is_fraud=True, risk_level="HIGH", probability=0.95)
        make_prediction(self.user, amount=30)
        dash = self.client.get("/analytics/api/dashboard/?period=weekly").json()
        self.assertEqual(dash["totals"]["total"], 2)
        self.assertEqual(dash["totals"]["fraud"], 1)
        self.assertEqual(len(dash["trend"]["labels"]), 8)
        self.assertEqual(sum(dash["trend"]["total"]), 2)
        self.assertEqual(len(dash["alerts"]), 1)
        analytics = self.client.get("/analytics/api/analytics/?period=monthly").json()
        self.assertEqual(analytics["totals"]["fraud_percentage"], 50.0)
        self.assertEqual(len(analytics["trend"]["labels"]), 6)

    def test_classic_template_pages_still_render(self):
        for url in ["/dashboard/", "/analytics/", "/prediction/predict/", "/prediction/history/", "/prediction/upload/"]:
            self.assertEqual(self.client.get(url).status_code, 200, url)

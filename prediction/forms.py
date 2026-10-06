from django import forms


class ManualPredictionForm(forms.Form):
    """Manual entry form. Since V1-V28 are PCA components a real user can't
    type meaningfully, we expose Amount + Time and let advanced users supply
    optional raw V1-V28 values (defaults to 0 = 'average' transaction)."""
    time_value = forms.FloatField(
        label="Transaction Time (seconds since first transaction)",
        initial=0,
        widget=forms.NumberInput(attrs={"class": "form-control"}),
    )
    amount = forms.FloatField(
        label="Transaction Amount ($)",
        min_value=0,
        widget=forms.NumberInput(attrs={"class": "form-control"}),
    )
    advanced_features = forms.CharField(
        label="Advanced: V1-V28 (comma-separated, optional)",
        required=False,
        help_text="Leave blank to use average (0) values. Paste 28 comma-separated numbers to override.",
        widget=forms.TextInput(attrs={"class": "form-control", "placeholder": "e.g. -1.2,0.3,2.1,..."}),
    )

    def clean_advanced_features(self):
        raw = self.cleaned_data.get("advanced_features", "").strip()
        if not raw:
            return [0.0] * 28
        parts = [p.strip() for p in raw.split(",") if p.strip() != ""]
        if len(parts) != 28:
            raise forms.ValidationError("Provide exactly 28 comma-separated numbers, or leave blank.")
        try:
            return [float(p) for p in parts]
        except ValueError:
            raise forms.ValidationError("All 28 values must be numeric.")


class CSVUploadForm(forms.Form):
    csv_file = forms.FileField(
        label="Transaction CSV file",
        help_text="Must contain columns: Time, V1-V28, Amount (Class column optional/ignored).",
        widget=forms.ClearableFileInput(attrs={"class": "form-control"}),
    )

    def clean_csv_file(self):
        f = self.cleaned_data["csv_file"]
        if not f.name.lower().endswith(".csv"):
            raise forms.ValidationError("Please upload a .csv file.")
        return f

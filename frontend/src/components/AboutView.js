// About View Component matching Image 5
export function renderAboutView(container) {
  container.innerHTML = `
    <div class="page-container">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 32px;">
        <div style="flex: 1;">
          <span style="display: inline-block; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 20px; margin-bottom: 12px;">
            Academic Machine Learning Project
          </span>
          <h1 style="font-size: 32px; font-weight: 800; color: #0f172a; line-height: 1.1; margin-bottom: 16px;">
            FraudWatch Technical Intelligence
          </h1>
          <p style="font-size: 15px; color: #475569; line-height: 1.6; max-width: 680px;">
            FraudWatch is an advanced computational framework designed to identify and predict fraudulent transaction patterns within complex financial ecosystems. Developed as part of a rigorous academic research initiative, this project leverages cutting-edge deep learning models to ensure data integrity and institutional security.
          </p>
        </div>
        
        <!-- AI Circuit Artwork Illustration Card -->
        <div style="width: 320px; height: 180px; background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ffffff; padding: 20px; box-shadow: 0 10px 25px rgba(30, 58, 138, 0.3); border: 1px solid rgba(255,255,255,0.1);">
          <i class="bi bi-cpu" style="font-size: 48px; color: #60a5fa; margin-bottom: 8px;"></i>
          <div style="font-size: 16px; font-weight: 800; letter-spacing: 1px;">FRAUD SHIELD AI</div>
          <div style="font-size: 10px; color: #93c5fd; text-transform: uppercase; margin-top: 2px;">NEURAL ARCHITECTURE ARCHIVE</div>
        </div>
      </div>

      <!-- Dataset & Algorithms Row -->
      <div style="display: grid; grid-template-columns: 360px 1fr; gap: 24px; margin-top: 12px;">
        <!-- Dataset Analysis Card -->
        <div class="card">
          <div style="display: flex; align-items: center; gap: 10px; font-weight: 700; color: #0f172a; margin-bottom: 14px;">
            <div class="metric-icon-box" style="width: 36px; height: 36px; background: #fff7ed; color: #ea580c; font-size: 18px;">
              <i class="bi bi-database"></i>
            </div>
            <span style="font-size: 16px;">Dataset Analysis</span>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 24px;">
            Utilizing the anonymized IEEE-CIS / Kaggle Fraud Detection dataset, comprising over 500,000 transactions with hundreds of high-dimensional features across identity and transaction domains.
          </p>

          <div style="display: flex; flex-direction: column; gap: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: #64748b;">Samples</span>
              <span style="font-weight: 800; color: #0f172a;">590,540</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: #64748b;">Features</span>
              <span style="font-weight: 800; color: #0f172a;">394 Variables</span>
            </div>
            <div class="progress-track" style="height: 6px; background: #e2e8f0; margin-top: 4px;">
              <div class="progress-fill blue" style="width: 100%;"></div>
            </div>
          </div>
        </div>

        <!-- Algorithms & Models Grid Card -->
        <div class="card">
          <div style="display: flex; align-items: center; gap: 10px; font-weight: 700; color: #0f172a; margin-bottom: 18px;">
            <div class="metric-icon-box blue" style="width: 36px; height: 36px; font-size: 18px;">
              <i class="bi bi-diagram-3"></i>
            </div>
            <span style="font-size: 16px;">Algorithms & Models</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background: #eff6ff; border-radius: 12px; padding: 18px;">
              <div style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 6px;">XGBOOST CLASSIFIER</div>
              <p style="font-size: 12px; color: #334155; line-height: 1.4;">
                Primary ensemble model optimized for structured tabular data with a focus on precision-recall curves.
              </p>
            </div>

            <div style="background: #f8fafc; border-radius: 12px; padding: 18px;">
              <div style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 6px;">LSTM NETWORKS</div>
              <p style="font-size: 12px; color: #334155; line-height: 1.4;">
                Long Short-Term Memory units utilized for sequential transaction pattern recognition and temporal drift.
              </p>
            </div>

            <div style="background: #f8fafc; border-radius: 12px; padding: 18px;">
              <div style="font-size: 11px; font-weight: 800; color: #9a3412; text-transform: uppercase; margin-bottom: 6px;">RANDOM FOREST</div>
              <p style="font-size: 12px; color: #334155; line-height: 1.4;">
                Used for feature importance extraction and baseline benchmarking across imbalanced classes.
              </p>
            </div>

            <div style="background: #eff6ff; border-radius: 12px; padding: 18px;">
              <div style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 6px;">SMOTE OVERSAMPLING</div>
              <p style="font-size: 12px; color: #334155; line-height: 1.4;">
                Synthetic Minority Over-sampling Technique applied to address severe class imbalance in fraud data.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Technology Stack Card -->
      <div class="card">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; font-weight: 700; color: #0f172a; margin-bottom: 14px;">
              <div class="metric-icon-box blue" style="width: 36px; height: 36px; font-size: 18px;">
                <i class="bi bi-cpu-fill"></i>
              </div>
              <span style="font-size: 16px;">Technology Stack</span>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              <span style="background: #f1f5f9; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #334155;">
                <span class="dot blue" style="display: inline-block; margin-right: 6px;"></span> Python 3.9+
              </span>
              <span style="background: #f1f5f9; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #334155;">
                <span class="dot red" style="display: inline-block; margin-right: 6px; background: #f97316;"></span> TensorFlow & Keras
              </span>
              <span style="background: #f1f5f9; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #334155;">
                <span class="dot blue" style="display: inline-block; margin-right: 6px;"></span> Bootstrap 5 & Vanilla CSS
              </span>
              <span style="background: #f1f5f9; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #334155;">
                <span class="dot blue" style="display: inline-block; margin-right: 6px;"></span> Scikit-Learn
              </span>
              <span style="background: #f1f5f9; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #334155;">
                <span class="dot blue" style="display: inline-block; margin-right: 6px;"></span> Django Backend
              </span>
              <span style="background: #f1f5f9; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #334155;">
                <span class="dot blue" style="display: inline-block; margin-right: 6px;"></span> MySQL / SQLite
              </span>
            </div>
          </div>

          <!-- Monitoring Toast -->
          <div style="background: #ffffff; border: 1px solid #fee2e2; border-radius: 12px; padding: 12px 18px; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow-sm);">
            <i class="bi bi-exclamation-triangle" style="color: #dc2626; font-size: 20px;"></i>
            <div>
              <div style="font-size: 12px; font-weight: 700; color: #0f172a;">System Monitoring</div>
              <div style="font-size: 11px; color: #64748b;">Active surveillance engaged.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Research Team & Academic Supervision Cards -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div class="card">
          <div style="display: flex; align-items: center; gap: 10px; font-weight: 700; color: #0f172a; margin-bottom: 18px;">
            <div class="metric-icon-box blue" style="width: 36px; height: 36px; font-size: 18px;">
              <i class="bi bi-people"></i>
            </div>
            <span style="font-size: 16px;">Research Team</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />
              <div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a;">Project Lead</div>
                <div style="font-size: 12px; color: #64748b;">Researcher Name Placeholder</div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />
              <div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a;">ML Engineer</div>
                <div style="font-size: 12px; color: #64748b;">Team Member Placeholder</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="border: 2px solid #2563eb; background: #ffffff;">
          <div style="display: flex; align-items: center; gap: 10px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">
            <div class="metric-icon-box blue" style="width: 36px; height: 36px; font-size: 18px;">
              <i class="bi bi-mortarboard"></i>
            </div>
            <span style="font-size: 16px;">Academic Supervision</span>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <div style="width: 44px; height: 44px; border-radius: 10px; background: #1e3a8a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 20px;">
              <i class="bi bi-person-badge"></i>
            </div>
            <div>
              <div style="font-size: 15px; font-weight: 800; color: #1e3a8a;">Dr. Supervisor Name Placeholder</div>
              <div style="font-size: 12px; color: #475569; margin-top: 2px;">
                Department Head of Data Science & Artificial Intelligence
              </div>
              <div style="display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px; margin-top: 10px;">
                <i class="bi bi-envelope"></i> supervisor@university.edu
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b;">
        <div>&copy; 2024 FraudWatch Technical Intelligence. Academic Project Purpose Only.</div>
        <div style="display: flex; gap: 16px;">
          <a href="#" style="color: #64748b; text-decoration: none;">Documentation</a>
          <a href="#" style="color: #64748b; text-decoration: none;">GitHub Repository</a>
          <a href="#" style="color: #64748b; text-decoration: none;">Privacy Policy</a>
        </div>
      </div>
    </div>
  `;
}

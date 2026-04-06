import { Upload, Hash, Link as LinkIcon, ScanText, ShieldCheck, FileSearch, ArrowRight } from 'lucide-react';
import './index.css';

const STEPS = [
  { id: 1, title: 'Upload File', icon: Upload },
  { id: 2, title: 'Generate Hash', icon: Hash },
  { id: 3, title: 'Store on Blockchain', icon: LinkIcon },
  { id: 4, title: 'Extract OCR Data', icon: ScanText },
  { id: 5, title: 'Verify Document', icon: FileSearch },
  { id: 6, title: 'Show Result', icon: ShieldCheck },
];

export default function HowItWorks() {
  return (
    <div className="how-it-works-section">
      <div className="hiw-bg"></div>
      
      <div className="hiw-content">
        <h2 className="hiw-title">HOW SECURE-VAULT WORKS</h2>
        <div className="hiw-subtitle">Hybrid Blockchain & OCR Verification</div>

        <div className="stepper-container">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="step-wrapper">
                <div className="step-box">
                  <div className="step-icon-wrapper">
                    <Icon className="step-icon" size={28} />
                  </div>
                  <div className="step-text">{step.title}</div>
                </div>
                
                {/* Connector Arrow */}
                {index < STEPS.length - 1 && (
                  <div className="step-connector">
                    <div className="connector-line"></div>
                    <ArrowRight className="connector-arrow" size={20} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

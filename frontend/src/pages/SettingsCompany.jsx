import CompanyLogo from '../components/CompanyLogo';
import { api } from '../services/api';

export default function SettingsCompany(props) {
  async function onLogoFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      props.onStatus?.('Logo must be PNG, JPG, or SVG.');
      event.target.value = '';
      return;
    }

    const processUpload = async (uploadFile, fallbackDataUrl) => {
      props.onStatus?.('Uploading logo to Google Drive...');
      try {
        const res = await api.uploadMedia(uploadFile);
        if (res && res.url) {
          props.setCompanyLogo(res.url);
          props.onStatus?.('Logo uploaded to Google Drive.');
        } else {
          throw new Error('Upload returned empty response.');
        }
      } catch (err) {
        console.warn('Google Drive upload failed, using local fallback:', err);
        props.setCompanyLogo(fallbackDataUrl);
        props.onStatus?.('Logo updated (local database storage).');
      }
    };

    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result || '');
        await processUpload(file, dataUrl);
      };
      reader.readAsDataURL(file);
      event.target.value = '';
      return;
    }

    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const fallbackDataUrl = canvas.toDataURL('image/webp', 0.86);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        props.setCompanyLogo(fallbackDataUrl);
        props.onStatus?.('Logo optimized.');
        return;
      }
      const uploadFile = new File([blob], 'company-logo.webp', { type: 'image/webp' });
      await processUpload(uploadFile, fallbackDataUrl);
    }, 'image/webp', 0.86);

    event.target.value = '';
  }

  return (
    <div className="glass-card form-card company-profile-card">
      <div className="card-header"><h3>Company Branding</h3></div>
      <div className="company-profile-layout">
        <div className="company-logo-editor">
          <CompanyLogo logo={props.companyLogo} name={props.companyName} size="xl" />
          <div className="company-logo-caption">
            <h2>{props.companyName || 'BAWAR STAR PLASTIC INDUSTRY'}</h2>
            <p>Premium Plastic Manufacturing Company</p>
          </div>
          <label className="secondary-btn logo-upload-btn">
            Upload Logo
            <input type="file" accept="image/png,image/jpeg,image/svg+xml" hidden onChange={onLogoFile} />
          </label>
          {props.companyLogo && <button className="ghost-btn" type="button" onClick={() => props.setCompanyLogo('')}>Remove Logo</button>}
        </div>
        <div className="settings-form">
          <label>Company Name<input type="text" value={props.companyName} onChange={(e) => props.setCompanyName(e.target.value)} /></label>
          <label>Company Address<input type="text" value={props.companyAddress} onChange={(e) => props.setCompanyAddress(e.target.value)} dir="auto" /></label>
          <label>Phone<input type="text" value={props.companyPhone} onChange={(e) => props.setCompanyPhone(e.target.value)} /></label>
          <label>Email<input type="email" value={props.companyEmail} onChange={(e) => props.setCompanyEmail(e.target.value)} /></label>
          <label>Website<input type="text" value={props.companyWebsite} onChange={(e) => props.setCompanyWebsite(e.target.value)} /></label>
          <label>Tax Number<input type="text" value={props.companyTaxNumber} onChange={(e) => props.setCompanyTaxNumber(e.target.value)} /></label>
          <label>Company License<input type="text" value={props.companyLicense} onChange={(e) => props.setCompanyLicense(e.target.value)} /></label>
        </div>
      </div>
    </div>
  );
}

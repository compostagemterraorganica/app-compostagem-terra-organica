const baseCss = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
.to-page { font-family: "DM Sans", sans-serif; color: #3a3a3a; width: 100%; max-width: none; margin: 0; padding: 0; }
.to-section { max-width: 1140px; margin: 0 auto; padding: 48px 20px; box-sizing: border-box; }
.to-section-title { color: #0274be; font-size: 2rem; margin: 0 0 16px; text-align: center; }
.to-section-lead { text-align: center; margin: 0 0 32px; max-width: 720px; margin-left: auto; margin-right: auto; font-size: 18px; line-height: 1.6; }
.to-page-hero { background-color: #99420e; background-position: center center; background-repeat: no-repeat; background-size: cover; min-height: 320px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 60px 20px; box-sizing: border-box; }
.to-page-hero--brand { background-color: #9D7B4E; }
.to-page-hero--brand .to-page-hero-heading,
.to-page-hero--brand .to-page-hero-heading strong,
.to-page-hero--brand .to-page-hero-lead { color: #fff; }
.to-page-hero-inner { max-width: 1140px; margin: 0 auto; }
.to-page-hero-heading { font-family: "DM Sans", sans-serif; color: #fff; margin: 0; line-height: 1.2; font-size: 48px; font-weight: 300; }
.to-page-hero-heading strong { font-weight: 700; display: block; font-size: 52px; }
.to-page-hero-lead { margin: 24px auto 0; max-width: 640px; font-size: 18px; line-height: 1.6; color: #fff; }
.to-prose { max-width: 900px; margin: 0 auto; font-size: 17px; line-height: 1.7; color: #54595f; }
.to-prose p { margin: 0 0 20px; }
.to-prose h2 { color: #0274be; font-size: 1.75rem; margin: 40px 0 16px; font-weight: 700; }
.to-prose h3 { color: #404040; font-size: 1.35rem; margin: 32px 0 12px; font-weight: 600; }
.to-prose ul { margin: 0 0 20px; padding-left: 24px; }
.to-prose li { margin-bottom: 8px; }
.to-btn { display: inline-block; background: #0274be; color: #fff; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; border: none; cursor: pointer; font-family: "DM Sans", sans-serif; font-size: 15px; transition: background 0.2s; }
.to-btn:hover { background: #3a3a3a; color: #fff; }
.to-btn--green { background: #3CAA59; border-radius: 50px; text-transform: uppercase; }
.to-btn--green:hover { background: #2d8a45; }
.to-card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 50px; }
.to-card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15); display: flex; flex-direction: column; }
.to-card a { text-decoration: none; color: inherit; display: flex; flex-direction: column; flex: 1; }
.to-card img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
.to-card h3 { font-size: 20px; font-weight: 700; color: #404040; margin: 0; padding: 20px 24px 8px; line-height: 1.35; }
.to-card p { margin: 0; padding: 0 24px 12px; font-size: 15px; line-height: 1.5; color: #54595f; flex: 1; }
.to-card .to-card-more { display: inline-block; margin: auto 24px 24px; font-size: 14px; text-transform: uppercase; text-decoration: underline; color: #0274be; }
.to-benefits-list { list-style: none; padding: 0; margin: 0; max-width: 700px; }
.to-benefits-list li { padding: 12px 0 12px 28px; position: relative; font-size: 17px; line-height: 1.5; border-bottom: 1px solid #eee; }
.to-benefits-list li::before { content: '✓'; position: absolute; left: 0; color: #3CAA59; font-weight: 700; }
.to-form-section { max-width: 700px; margin: 0 auto; padding: 48px 20px; }
.to-form-section h3 { text-align: center; color: #404040; font-size: 1.5rem; margin: 0 0 32px; }
.to-form { display: flex; flex-direction: column; gap: 16px; }
.to-form label { font-size: 14px; color: #54595f; font-weight: 600; }
.to-form input, .to-form textarea { width: 100%; padding: 12px 16px; border: 1px solid #ccc; border-radius: 4px; font-family: "DM Sans", sans-serif; font-size: 16px; box-sizing: border-box; }
.to-form textarea { min-height: 140px; resize: vertical; }
.to-form button { align-self: flex-start; }
.to-form-status { margin-top: 12px; color: #3CAA59; font-weight: 600; }
.to-form-error { margin-top: 12px; color: #c0392b; font-weight: 600; }
.to-map-section { max-width: 1140px; margin: 0 auto; padding: 48px 20px; text-align: center; }
.to-map-section h2 { font-size: 1.5rem; font-weight: 400; color: #404040; margin: 0 0 32px; }
.to-map-wrap { position: relative; width: 100%; max-width: 900px; margin: 0 auto; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12); }
.to-map-wrap iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
.to-cta-banner { background: #9d7b4e; color: #fff; text-align: center; padding: 60px 20px; }
.to-cta-banner h2 { margin: 0 0 16px; font-size: 2rem; font-weight: 300; }
.to-cta-banner h2 strong { font-weight: 700; }
.to-cta-banner p { margin: 0 0 24px; font-size: 18px; max-width: 640px; margin-left: auto; margin-right: auto; }
@media (max-width: 900px) {
  .to-card-grid { grid-template-columns: 1fr; }
}
@media (max-width: 767px) {
  .to-page-hero { min-height: 240px; padding: 40px 16px; }
  .to-page-hero-heading { font-size: 32px; }
  .to-page-hero-heading strong { font-size: 36px; }
  .to-section { padding: 32px 16px; }
}
`.trim()

module.exports = { baseCss }

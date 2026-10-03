* {
  box-sizing: border-box;
}

:root {
  --bg: #07111f;
  --panel: #122338;
  --panel-alt: #19324d;
  --text: #e9f3ff;
  --muted: #adcaef;
  --primary: #5ec4ff;
  --secondary: #8ef0dc;
  --highlight: #ffd166;
  --danger: #ff7b72;
}

body {
  margin: 0;
  font-family: Inter, Arial, sans-serif;
  background: linear-gradient(135deg, #050d18 0%, #0f2340 100%);
  color: var(--text);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 20px 60px;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  text-transform: uppercase;
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--secondary);
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
}

.grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 24px;
}

.panel {
  background: rgba(18, 35, 56, 0.92);
  border: 1px solid rgba(94, 196, 255, 0.2);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

label {
  display: block;
  margin-bottom: 10px;
  color: var(--muted);
}

input,
textarea {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(7, 17, 31, 0.45);
  color: var(--text);
  padding: 12px 14px;
  font: inherit;
}

textarea {
  min-height: 300px;
  resize: vertical;
  margin-top: 8px;
  margin-bottom: 18px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

button {
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font: inherit;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
  opacity: 0.96;
}

.primary-button {
  background: linear-gradient(90deg, var(--primary), #7aaeff);
  color: #041521;
  font-weight: 700;
}

.secondary-button {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.status {
  background: rgba(142, 240, 220, 0.12);
  border: 1px solid rgba(142, 240, 220, 0.28);
  color: var(--secondary);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
}

.results {
  display: grid;
  gap: 14px;
}

.card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px;
}

.card h3 {
  margin-top: 0;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(94, 196, 255, 0.12);
  color: var(--primary);
  font-size: 12px;
  margin-bottom: 8px;
}

ul {
  padding-left: 18px;
  color: var(--muted);
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--muted);
  font-size: 13px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}

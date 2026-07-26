# Ticker - Automatic Website Time Tracker

Track your time effortlessly with a smart, draggable floating timer. 100% private, offline, and no account required.

## Features

- **Privacy First:** Ticker is an offline-first extension. Your data never leaves your device. No accounts, no cloud sync, just you and your data.
- **Smart Tracking:** Automatically pauses when you're idle, switch tabs, or lose focus.
- **Floating Timer:** A sleek, draggable widget that stays with you on the websites you track.
- **Detailed Analytics:** View your time spent across different days, weeks, and months with built-in charts.
- **Export & Import:** Full control over your data. Export your history to JSON or CSV.

## Installation

### From Chrome Web Store
*(Link coming soon once published)*

### Manual Installation (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/VishalDhariwal/Ticker.git
   cd Ticker
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Open Google Chrome and go to `chrome://extensions/`.
5. Enable **Developer mode** (toggle in the top right).
6. Click **Load unpacked** and select the `dist` folder generated in the `Ticker` directory.

## Development

Ticker is built using React, TypeScript, and Vite.

- `npm run dev`: Starts the Vite development server and watches for changes.
- `npm run build`: Builds the project into the `dist` directory.
- `npm run type-check`: Runs TypeScript type checking.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

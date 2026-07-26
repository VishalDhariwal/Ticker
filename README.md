# Ticker - Automatic Website Time Tracker (Chrome Extension)

Track learning time on sites like LeetCode. Perfect for students to monitor study sessions and assign time to specific tasks. 100% private, offline, and no account required.

## Features

- **Privacy First:** Ticker is an offline-first extension. Your data never leaves your device. No accounts, no cloud sync, just you and your data.
- **Smart Tracking:** Automatically pauses when you're idle, switch tabs, or lose focus.
- **Floating Timer:** A sleek, draggable widget that stays with you on the websites you track.
- **Detailed Analytics:** View your time spent across different days, weeks, and months with built-in charts.
- **Export & Import:** Full control over your data. Export your history to JSON or CSV.

## How to Use

1. **Add Websites to Track:** Click the Ticker extension icon, then click the settings gear ⚙️ to open your Dashboard. Go to the **Websites** tab and add the domains you want to track (e.g., `youtube.com`, `twitter.com`).
2. **Manage Tasks (Todos):** In the Dashboard, go to the **Todos** tab to create specific tasks you want to track time against (e.g., "Research", "Development").
3. **Start Tracking:** Simply visit any tracked website! A draggable floating timer will appear on the page, showing your tracked time for that site today.
4. **Select a Task:** Click the floating timer (or open the extension popup) to assign your active session to one of your tasks.
5. **View Analytics:** Open your Dashboard and check the **Analytics** tab to visualize your time spent across websites and tasks over days, weeks, and months.

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

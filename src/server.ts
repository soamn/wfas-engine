import app from "./app.js";
import config from "./config/config.js";
// import { startMemoryMonitor } from "./utils/vitals.js";
// startMemoryMonitor(1 * 1000);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

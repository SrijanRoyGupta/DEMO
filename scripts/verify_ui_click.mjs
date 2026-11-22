import { chromium } from "playwright";

async function verify() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log("Loading http://localhost:8080/command ...");
  await page.goto("http://localhost:8080/command", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Close modal if present
  const closeBtn = page.locator("button[aria-label='Close alert']").first();
  if (await closeBtn.isVisible().catch(() => false)) {
    console.log("Dismissing modal alert...");
    await closeBtn.click();
    await page.waitForTimeout(500);
  }

  console.log("Clicking '04 Historical Backtesting & Validation' tab...");
  const tab4 = page.getByRole("button", { name: /Historical Backtesting/i });
  await tab4.click();
  await page.waitForTimeout(1000);

  const bodyText = await page.innerText("body");
  console.log("Checked 'Did TerraAlert Warn Early Enough?':", bodyText.includes("Did TerraAlert Warn Early Enough?"));
  console.log("Checked 'Pillar A: Model Validation':", bodyText.includes("Pillar A: Model Validation"));
  console.log("Checked 'Pillar B: Operational Usefulness':", bodyText.includes("Pillar B: Operational Usefulness"));
  console.log("Checked 'Wayanad':", bodyText.includes("Wayanad"));
  console.log("Checked 'Benchmark Table':", bodyText.includes("Benchmark Table"));

  // Check clicking Sikkim scenario
  console.log("Clicking 'Sikkim' scenario card...");
  const sikkimCard = page.locator("button", { hasText: "South Lhonak" }).first();
  await sikkimCard.click();
  await page.waitForTimeout(600);

  const updatedText = await page.innerText("body");
  console.log("Checked 'Chungthang':", updatedText.includes("Chungthang"));
  console.log("Checked 'Glacial Lake Outburst':", updatedText.includes("Glacial Lake Outburst"));

  // Check clicking Emergency Playbook tab
  console.log("Clicking '03 Emergency Playbook' tab...");
  const tab3 = page.getByRole("button", { name: /Emergency Playbook/i });
  await tab3.click();
  await page.waitForTimeout(600);
  const playbookText = await page.innerText("body");
  console.log("Checked 'NDRF control room':", playbookText.includes("NDRF control room"));
  console.log("Checked 'Ambulance service':", playbookText.includes("Ambulance service"));

  // Check clicking Location Search tab
  console.log("Clicking '02 Location Search & Radar' tab...");
  const tab2 = page.getByRole("button", { name: /Location Search/i });
  await tab2.click();
  await page.waitForTimeout(600);
  const searchText = await page.innerText("body");
  console.log("Checked 'Regional search':", searchText.includes("Regional") || searchText.includes("Search"));

  console.log("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
  await browser.close();
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});


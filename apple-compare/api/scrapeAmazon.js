const { chromium } = require("playwright");

/**
 * Tries to extract the main Amazon product price in INR.
 * Amazon pages contain many prices (EMI, accessories, bundles).
 * We target the "price to pay" blocks first, then validate range.
 */
async function extractPriceINR(page) {
  // 1) Try strongest known Amazon price containers first
  const selectors = [
    "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
    "#corePrice_feature_div .a-price .a-offscreen",
    "#apex_desktop .a-price .a-offscreen",
    "#tp-tool-tip-subtotal-price-value",
    "#priceblock_dealprice",
    "#priceblock_ourprice",
  ];

  for (const sel of selectors) {
    const txt = await page.locator(sel).first().textContent().catch(() => null);
    if (!txt) continue;

    const m = txt.match(/([\d,]+)/);
    if (!m) continue;

    const num = Number(m[1].replace(/,/g, ""));
    if (num >= 30000 && num <= 300000) return num;
  }

  // 2) Fallback: choose a robust candidate from all prices on page
  const allTexts = await page.locator(".a-price .a-offscreen").allTextContents().catch(() => []);
  const nums = allTexts
    .map(t => {
      const m = t.match(/([\d,]+)/);
      return m ? Number(m[1].replace(/,/g, "")) : null;
    })
    .filter(n => typeof n === "number" && n >= 30000 && n <= 300000);

  console.log("DEBUG prices found (first 20):", allTexts.slice(0, 20));

  if (nums.length === 0) return null;

  // Median strategy (removes accessories & weird extremes)
  nums.sort((a, b) => a - b);
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0
    ? Math.round((nums[mid - 1] + nums[mid]) / 2)
    : nums[mid];
}


async function scrapeAmazonPrice(asin) {
  const url = `https://www.amazon.in/dp/${asin}`;

  const browser = await chromium.launch({ headless: true });

  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "en-IN",
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // If Amazon shows a captcha/robot check, price will likely fail.
  // We still try to extract price; debug output helps.
  const priceNum = await extractPriceINR(page);

  await browser.close();
  return priceNum;
}

// TEST RUN
(async () => {
  const asin = "B0CHX2F5QT"; // your Amazon.in ASIN
  const priceNum = await scrapeAmazonPrice(asin);

  console.log(
    "SCRAPED PRICE:",
    priceNum ? `₹${priceNum.toLocaleString("en-IN")}` : null
  );
})();

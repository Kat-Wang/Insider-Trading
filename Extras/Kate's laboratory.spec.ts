import { type Page, test, utils } from "@playwright/test";
import { appendFile, readFile } from "fs/promises";

const TOTAL_PAGES = 3534;

test("Kate's laboratory", async ({ page }) => {
  const log = logFor(Math.floor(TOTAL_PAGES));

  const fileName = "/Users/spyue/Desktop/trades.json";

  const { URLs: { Page: lastPageUrl = null } = {} } = JSON.parse(
    (await readFile(fileName, "utf-8").catch(() => "{}")).trim().split("\n").at(-1) || "{}"
  );

  const firstPageNumber = +((lastPageUrl && new URL(lastPageUrl).searchParams.get("page")) ?? 0) + 1;

  if (firstPageNumber > 1) {
    log("Continuing from page", firstPageNumber);

    log.tick(firstPageNumber);
  }

  for (let pageNumber = firstPageNumber; pageNumber <= TOTAL_PAGES; ++pageNumber, log.tick()) {
    const pageUrl = `https://www.capitoltrades.com/trades?page=${pageNumber}`;

    log(`${COLORS.BOLD + COLORS.BLUE}Opening`, COLORS.CYAN + COLORS.UNDERLINE + pageUrl + COLORS.RESET);

    await page.goto(pageUrl);

    await page.locator(".q-pagination").waitFor({ state: "attached" });

    const rowUrls = (
      await Promise.all((await page.locator("a.entity-transaction").all()).map((x) => x.getAttribute("href")))
    )
      .filter(utils.Boolean)
      .map((x) => `https://www.capitoltrades.com${x}`);

    const rows = await Promise.all(
      rowUrls.map(async (rowUrl, j) => {
        const tab = await page.context().newPage();

        log(
          `  ${COLORS.BOLD + COLORS.BLUE}Opening row${COLORS.RESET}`,
          j,
          `${COLORS.BOLD + COLORS.BLUE}of${COLORS.RESET}`,
          rowUrls.length,
          COLORS.CYAN + COLORS.UNDERLINE + rowUrl + COLORS.RESET
        );

        const row = await getRow(log, tab, pageUrl, rowUrl);

        tab.close();

        return JSON.stringify(row);
      })
    );

    log("    Writing to", COLORS.CYAN + COLORS.UNDERLINE + fileName + COLORS.RESET);

    await appendFile(fileName, `${rows.join("\n")}\n`);
  }
});

const getRow = async (log: ReturnType<typeof logFor>, tab: Page, pageUrl: string, rowUrl: string) => {
  await tab.goto(rowUrl);

  log("    Clicking Show details");

  await tab.locator(".controls.show-details div").click({ force: true });

  log("    Reading details");

  return {
    URLs: {
      Page: pageUrl,
      Row: rowUrl,
    },
    ...(await readDetails(tab)),
  };
};

const logFor = (
  total: number,
  log = (...x: any[]) =>
    console.log(
      COLORS.DIM,
      `[${COLORS.YELLOW}${new Date().toISOString().slice(11, -1)}${COLORS.WHITE}]`,
      `${((ticks / total) * 100).toFixed(0)}%`.padStart(3),
      `[${" "
        .repeat(10)
        .replace(" ".repeat(Math.round((ticks / total) * 10)), ".".repeat(Math.round((ticks / total) * 10)))}]${
        COLORS.RESET
      }`,
      ...x,
      COLORS.RESET
    ),
  ticks = 0
) => Object.assign(log, { tick: (by = 1) => (ticks += by) });

const COLORS = {
  BLUE: "\x1b[34m",
  BOLD: "\x1b[1m",
  CYAN: "\x1b[36m",
  DIM: "\x1b[2m",
  RESET: "\x1b[0m",
  UNDERLINE: "\x1b[4m",
  WHITE: "\x1b[37m",
  YELLOW: "\x1b[33m",
};

const readDetails = async (page: Page) =>
  page.evaluate(() => {
    const toDate = (x: any) => (/^\d\d\d\d-\d\d-\d\d$/.test(x) ? +new Date(`${x} GMT-0600`) : x);

    const toNumber = (x: any) => (Number.isFinite(+x) ? +x : x);

    const toNull = (x: any) => (x === "N/A" ? null : x);

    const $ = (x: string) => toNull(toNumber(toDate(document.querySelector(x)?.textContent)));

    $.href = (x: string) => document.querySelector<HTMLAnchorElement>(x)?.href;

    $.all = (x: string) => Array.from(document.querySelectorAll(x)).map((y) => toNull(toNumber(toDate(y.textContent))));

    return {
      Amount: $(".trade-value"),
      Issuer: {
        Name: $(".issuer .entity-issuer"),
        Ticker: $(".issuer .q-label"),
        URL: $.href(".issuer .entity-issuer"),
      },
      Politician: {
        Chamber: $(".politician .chamber"),
        Name: $(".politician .entity-politician"),
        Party: $(".politician .party"),
        State: $(".politician .us-state-full"),
        URL: $.href(".politician .entity-politician"),
      },
      "Transaction Type": $(".trade-logo"),
      ...Object.fromEntries(
        ((labels = $.all(".issuer ~ .q-data-cell .q-label"), values = $.all(".issuer ~ .q-data-cell .q-value")) =>
          labels.map((label, i) => [label, values[i]]))()
      ),
      "Additional Information": $(".trade-comment q"),
      "Original Filing": $.href(".view-filing a"),
    };
  });

test.describe.configure({
  retries: 0,
  timeout: 0,
});

test.use({
  viewport: {
    height: 1000,
    width: 1200,
  },
});

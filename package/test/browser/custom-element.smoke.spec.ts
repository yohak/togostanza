import { expect, test } from "@playwright/test";

test("renders a custom element with an open shadow root", async ({ page }) => {
  await page.setContent(`
    <togostanza-smoke data-label="ready"></togostanza-smoke>
    <script type="module">
      class SmokeStanza extends HTMLElement {
        connectedCallback() {
          const root = this.attachShadow({ mode: "open" });
          const main = document.createElement("main");
          main.textContent = this.getAttribute("data-label") ?? "";
          root.append(main);
        }
      }

      customElements.define("togostanza-smoke", SmokeStanza);
    </script>
  `);

  const renderedText = await page
    .locator("togostanza-smoke")
    .evaluate((element) => element.shadowRoot?.querySelector("main")?.textContent);

  expect(renderedText).toBe("ready");
});

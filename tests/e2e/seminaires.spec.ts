import { test, expect } from '@playwright/test';

/**
 * Corpus pages – Editions & Navigation Tests
 * ─────────────────────────────────────────────
 * Tests: Séminaires, Colloques, Journées d'études
 *
 * Each page must:
 *  1. Show a heading banner with the corpus title.
 *  2. Render at least one EditionCard (data-testid="edition-card").
 *  3. Show a "conferences" count inside the card.
 *  4. Navigate to an edition detail page on card click.
 *
 * Navigation best practice:
 *  - We test that clicking a card navigates to a URL matching the expected pattern.
 *  - We then verify the destination page loads (no error, heading present).
 *  - We do NOT assert specific titles/IDs since data is dynamic from the API.
 */

const CORPUS_PAGES = [
    {
        name: 'Séminaires',
        path: '/corpus/seminaires',
        titlePattern: /séminaire/i,
        editionUrlPattern: /\/corpus\/seminaires\/edition\/\d+/,
    },
    {
        name: 'Colloques',
        path: '/corpus/colloques',
        titlePattern: /colloque/i,
        editionUrlPattern: /\/corpus\/colloques\/edition\/\d+/,
    },
    {
        name: "Journées d'études",
        path: '/corpus/journees-etudes',
        titlePattern: /journ[ée]e/i,
        editionUrlPattern: /\/corpus\/journees-etudes\/edition\/\d+/,
    },
];

for (const corpus of CORPUS_PAGES) {
    test.describe(`${corpus.name} – Editions list`, () => {
        test.beforeEach(async ({ page }) => {
            await page.goto(corpus.path);
            await page.waitForLoadState('networkidle');
        });

        test('loads without JS errors', async ({ page }) => {
            const errors: string[] = [];
            page.on('pageerror', (err) => errors.push(err.message));
            await expect(page).not.toHaveURL(/error/i);
            expect(errors).toHaveLength(0);
        });

        test('shows the PageBanner with the corpus title', async ({ page }) => {
            const heading = page.getByRole('heading', { name: corpus.titlePattern }).first();
            await expect(heading).toBeVisible({ timeout: 15_000 });
        });

        test('displays at least one edition card', async ({ page }) => {
            const firstCard = page.getByTestId('edition-card').first();
            await expect(firstCard).toBeVisible({ timeout: 20_000 });

            // The card must contain a non-empty h2 title
            const h2 = firstCard.locator('h2');
            const text = await h2.textContent();
            expect(text?.trim().length).toBeGreaterThan(0);
        });

        test('edition card shows a "conferences" count', async ({ page }) => {
            const firstCard = page.getByTestId('edition-card').first();
            await expect(firstCard).toBeVisible({ timeout: 20_000 });

            const confText = firstCard.getByText(/conférence/i);
            await expect(confText).toBeVisible();
        });

        test('clicking an edition card navigates to the edition detail page', async ({ page }) => {
            const firstCard = page.getByTestId('edition-card').first();
            await expect(firstCard).toBeVisible({ timeout: 20_000 });

            await firstCard.click();

            // URL should change to the expected edition URL pattern
            await expect(page).toHaveURL(corpus.editionUrlPattern, { timeout: 10_000 });

            // The destination page should load without errors and show a heading
            await page.waitForLoadState('networkidle');
            await expect(page).not.toHaveURL(/error/i);
            const heading = page.getByRole('heading').first();
            await expect(heading).toBeVisible({ timeout: 15_000 });
        });
    });
}

/**
 * Seminar – Conference detail smoke test
 * Verifies a known conference ID loads properly.
 */
test.describe('Seminar – conference detail', () => {
    const CONFERENCE_ID = 21220;

    test.beforeEach(async ({ page }) => {
        await page.goto(`/corpus/seminaires/conference/${CONFERENCE_ID}`);
        await page.waitForLoadState('load');
    });

    test('shows a non-empty heading', async ({ page }) => {
        const heading = page.getByRole('heading').first();
        await expect(heading).toBeVisible({ timeout: 20_000 });
        const text = await heading.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
    });

    test('does not show a 404 or generic error', async ({ page }) => {
        await expect(page.getByText(/erreur|not found|404/i)).not.toBeVisible();
    });
});

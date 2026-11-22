import { test, expect } from '@playwright/test';

/**
 * Home page – Smoke Tests
 * ─────────────────────────
 * Covers:
 *   - Navbar & Corpus dropdown
 *   - CorpusSection carousel ("Explore the corpus")
 *   - IntervenantsSection (randomly fetched via API)
 *   - KeywordHighlight section
 */
test.describe('Home page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('loads without JS errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await expect(page).not.toHaveURL(/error/i);
        expect(errors).toHaveLength(0);
    });

    // ── Navbar ────────────────────────────────────────────────────────────────
    test('shows the sticky navbar', async ({ page }) => {
        await expect(page.locator('nav').first()).toBeVisible();
    });

    test('navbar has the Corpus dropdown trigger', async ({ page }) => {
        const corpusTrigger = page.locator('nav').getByText('Corpus').first();
        await expect(corpusTrigger).toBeVisible();
    });

    test('navbar has Intervenants link', async ({ page }) => {
        const link = page.locator('nav').getByRole('link', { name: 'Intervenants' });
        await expect(link).toBeVisible();
    });

    test('Corpus dropdown reveals Séminaires link on hover', async ({ page }) => {
        const corpusTrigger = page.locator('nav').getByText('Corpus').first();
        await corpusTrigger.hover();
        const seminairesLink = page.getByRole('link', { name: /séminaire/i }).first();
        await expect(seminairesLink).toBeVisible({ timeout: 5000 });
    });

    // ── CorpusSection – Carousel "Explore the corpus" ─────────────────────
    test('CorpusSection: shows the carousel cards', async ({ page }) => {
        const corpusCards = page.getByTestId('corpus-section-card');
        await expect(corpusCards.first()).toBeVisible({ timeout: 15_000 });

        const count = await corpusCards.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('CorpusSection: clicking a corpus card navigates to a corpus page', async ({ page }) => {
        const corpusCards = page.getByTestId('corpus-section-card');
        await expect(corpusCards.first()).toBeVisible({ timeout: 15_000 });

        // Navigate to the target and verify the page loads properly
        await corpusCards.first().click();
        await page.waitForLoadState('networkidle');

        // Assert we navigated to a /corpus/ route
        await expect(page).toHaveURL(/\/corpus\//);
        await expect(page).not.toHaveURL(/error/i);

        // Must show meaningful content (h1 or h2)
        const heading = page.getByRole('heading').first();
        await expect(heading).toBeVisible({ timeout: 15_000 });
    });

    // ── IntervenantsSection ───────────────────────────────────────────────────
    test('IntervenantsSection: renders the section title', async ({ page }) => {
        const title = page.getByRole('heading', { name: /intervenants/i }).first();
        await expect(title).toBeVisible({ timeout: 15_000 });
    });

    test('IntervenantsSection: displays at least one intervenant card', async ({ page }) => {
        await expect(page.getByTestId('intervenants-section-ready')).toBeVisible({ timeout: 25_000 });

        const cards = page.getByTestId('intervenant-card');
        const count = await cards.count();
        test.skip(count === 0, 'No intervenant data available in the test environment');

        await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    });

    // ── KeywordHighlight section ──────────────────────────────────────────────
    test('KeywordHighlight: section is visible on the page', async ({ page }) => {
        await expect(
            page.getByTestId('keyword-section-ready').or(page.getByTestId('keyword-section-empty')),
        ).toBeVisible({ timeout: 30_000 });
    });

    test('KeywordHighlight: displays at least one result card', async ({ page }) => {
        await expect(page.getByTestId('keyword-section-ready')).toBeVisible({ timeout: 30_000 });

        const resultCards = page.getByTestId('keyword-resource-card');
        const count = await resultCards.count();
        test.skip(count === 0, 'No keyword highlight data available in the test environment');

        await expect(resultCards.first()).toBeVisible({ timeout: 10_000 });
    });
});

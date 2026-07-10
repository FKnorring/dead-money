/**
 * E2E tests for the full dead-money app flow.
 *
 * Seam: the running SvelteKit dev server at localhost:5173 started with
 * `--mode e2etest`, which loads .env.e2etest pointing at the dedicated
 * test Supabase project.
 *
 * Tests run serially (workers: 1) to avoid concurrent DB writes.
 * Each test tracks the IDs it creates; afterAll cleans up via the admin client.
 */
import { test, expect, type Page, type Browser } from '@playwright/test';
import { adminDb, cleanupTestData } from './db';

// ── Cleanup tracking ──────────────────────────────────────────────────────────

const createdSessionIds: string[] = [];
const createdPlayerIds: string[] = [];

test.afterEach(async () => {
	// Force-close any open sessions so goto('/') doesn't redirect to a prior test's
	// session. The +page.ts load function redirects to the last lobby/active session,
	// which would prevent subsequent tests from reaching the home screen.
	if (createdSessionIds.length > 0) {
		await adminDb
			.from('sessions')
			.update({ state: 'closed' })
			.in('id', createdSessionIds)
			.in('state', ['lobby', 'active']);
	}
});

test.afterAll(async () => {
	await cleanupTestData(createdSessionIds, createdPlayerIds);
});

// ── UI helpers ────────────────────────────────────────────────────────────────

/**
 * Create a new session via the home screen "New Game" sheet.
 * Returns the full /session/<id> URL after redirect.
 */
async function createSessionViaUI(page: Page, hostName: string): Promise<string> {
	await page.goto('/');
	// networkidle on the home page takes ~1s (one Supabase fetch). This ensures
	// SvelteKit's load() has resolved and Svelte has hydrated before we click.
	await page.waitForLoadState('networkidle', { timeout: 15000 });
	await page.getByRole('button', { name: 'New Game' }).click();

	// Step 1 — identity
	// Wait for the sheet to fully open (showModal() fires in a Svelte $effect after
	// the DOM update, so we wait for `visible` — not just `attached` — to ensure the
	// dialog is in modal mode and its footer buttons are in the accessibility tree).
	await page.getByPlaceholder('Your name…').waitFor({ state: 'visible', timeout: 10000 });
	await page.getByPlaceholder('Your name…').fill(hostName);
	// "Next →" button becomes enabled once nameQuery is non-empty; wait for it.
	await page.getByRole('button', { name: /Next/ }).waitFor({ state: 'visible', timeout: 5000 });
	await page.getByRole('button', { name: /Next/ }).click();

	// Step 2 — game config (accept default 200 kr buy-in)
	await page.getByRole('button', { name: /Create Game/ }).waitFor({ state: 'visible', timeout: 10000 });
	await page.getByRole('button', { name: /Create Game/ }).click();

	// Redirects to /session/<id>
	await page.waitForURL(/\/session\/[^/]+$/);
	return page.url();
}

/** Extract the session ID from a /session/<id> URL. */
function sessionIdFromUrl(url: string): string {
	const match = url.match(/\/session\/([^/]+)/);
	if (!match) throw new Error(`Could not extract session ID from: ${url}`);
	return match[1];
}

/**
 * Add a player to the lobby using the "Add Player" host sheet.
 */
async function addPlayerViaHostSheet(page: Page, name: string): Promise<void> {
	await page.getByRole('button', { name: '+ Add Player' }).click();
	// Wait for the sheet to be fully open before interacting with its contents
	await page.getByPlaceholder('Search by name…').waitFor({ state: 'visible', timeout: 10000 });
	await page.getByPlaceholder('Search by name…').fill(name);
	await page.getByRole('button', { name: 'Add to Game' }).waitFor({ state: 'visible', timeout: 5000 });
	await page.getByRole('button', { name: 'Add to Game' }).click();
	// Wait for the player to appear in the seat list
	await expect(page.getByText(name)).toBeVisible({ timeout: 8000 });
}

/**
 * Open a second browser context that joins the session as the named player.
 * Returns the second Page (caller is responsible for closing its context).
 *
 * The join overlay shows a list of buttons, each containing the player name
 * and either "→ Join" (unclaimed) or "taken". Playwright concatenates all
 * text content, so we match with a regex on the name.
 */
async function joinAsPlayer(browser: Browser, sessionUrl: string, playerName: string): Promise<Page> {
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	// Register response waiter BEFORE goto so we don't miss it. The session page
	// makes a client-side GET /seats after Svelte hydrates (even though seats also
	// arrive via SSR). Awaiting this response is the reliable hydration signal —
	// after it resolves, Svelte onclick handlers are bound and claimSeat() will fire.
	const seatsReady = page.waitForResponse(
		r => r.url().includes('/rest/v1/seats') && r.status() < 500,
		{ timeout: 15000 }
	);
	await page.goto(sessionUrl);
	await seatsReady;
	// Click the unclaimed seat row — use regex since the button text includes the
	// player name plus "→ Join" from the inner span.
	await page.getByRole('button', { name: new RegExp(playerName) }).first().click();
	// Wait until the overlay is gone (seat is claimed)
	await expect(page.getByText('Who are you?')).not.toBeVisible({ timeout: 8000 });
	return page;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test('home screen shows New Game button and Leaderboard link', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Leaderboard' })).toBeVisible();
});

test('host creates a session and sees the lobby with their seat marked Ready', async ({ page }) => {
	const sessionUrl = await createSessionViaUI(page, 'E2E-Host-A');
	const sessionId = sessionIdFromUrl(sessionUrl);
	createdSessionIds.push(sessionId);

	// Host's seat visible and marked Ready
	await expect(page.getByText('E2E-Host-A')).toBeVisible();
	await expect(page.getByText('Ready ✓')).toBeVisible();

	// Start Game button visible but disabled (only 1 player)
	const startBtn = page.getByRole('button', { name: /Start Game/ });
	await expect(startBtn).toBeVisible();
	await expect(startBtn).toBeDisabled();
});

test('host adds a second player and starts the session; both clients land on /play', async ({ page, browser }) => {
	const sessionUrl = await createSessionViaUI(page, 'E2E-Host-B');
	const sessionId = sessionIdFromUrl(sessionUrl);
	createdSessionIds.push(sessionId);

	await addPlayerViaHostSheet(page, 'E2E-Player-B');
	await expect(page.getByText('E2E-Player-B')).toBeVisible();

	// Second client joins
	const page2 = await joinAsPlayer(browser, sessionUrl, 'E2E-Player-B');

	// Host sees both seats as Ready (Realtime update)
	await expect(page.getByText('Ready ✓')).toHaveCount(2, { timeout: 8000 });

	// Host starts the session
	const startBtn = page.getByRole('button', { name: /Start Game/ });
	await expect(startBtn).toBeEnabled({ timeout: 5000 });
	await startBtn.click();

	// Both clients redirect to /play
	await page.waitForURL(/\/play$/, { timeout: 10000 });
	await page2.waitForURL(/\/play$/, { timeout: 10000 });

	await page2.context().close();
});

test('player records a buy-in and their stack is shown', async ({ page, browser }) => {
	const sessionUrl = await createSessionViaUI(page, 'E2E-Host-C');
	const sessionId = sessionIdFromUrl(sessionUrl);
	createdSessionIds.push(sessionId);

	await addPlayerViaHostSheet(page, 'E2E-Player-C');
	const page2 = await joinAsPlayer(browser, sessionUrl, 'E2E-Player-C');
	await expect(page.getByText('Ready ✓')).toHaveCount(2, { timeout: 8000 });
	await page.getByRole('button', { name: /Start Game/ }).click();
	await page.waitForURL(/\/play$/, { timeout: 10000 });
	await page2.waitForURL(/\/play$/, { timeout: 10000 });

	// Host is on "My Session" tab — buy-in chip buttons show the multiplier label
	// Default buy-in is 200 kr, so "1×" chip = 200 kr
	const buyInChip = page.getByRole('button', { name: '1×' });
	await expect(buyInChip).toBeVisible();
	await buyInChip.click();

	// Stack should now display 200 kr
	await expect(page.locator('text=200 kr').first()).toBeVisible({ timeout: 5000 });

	await page2.context().close();
});

test('host cashes out players and ends the session; settlement screen shows correct nets', async ({ page, browser }) => {
	const sessionUrl = await createSessionViaUI(page, 'E2E-Host-D');
	const sessionId = sessionIdFromUrl(sessionUrl);
	createdSessionIds.push(sessionId);

	await addPlayerViaHostSheet(page, 'E2E-Player-D');
	const page2 = await joinAsPlayer(browser, sessionUrl, 'E2E-Player-D');
	await expect(page.getByText('Ready ✓')).toHaveCount(2, { timeout: 8000 });
	await page.getByRole('button', { name: /Start Game/ }).click();
	await page.waitForURL(/\/play$/, { timeout: 10000 });
	await page2.waitForURL(/\/play$/, { timeout: 10000 });

	// Both players buy in 200 kr
	await page.getByRole('button', { name: '1×' }).click();
	await page2.getByRole('button', { name: '1×' }).click();

	// Host switches to The Table tab to cash out
	await page.getByRole('button', { name: 'The Table' }).click();

	// Cash out host (E2E-Host-D) with 300 kr → net +100
	await page.getByRole('button', { name: 'Cash out E2E-Host-D' }).click();
	await page.getByPlaceholder('Final stack (kr)').fill('300');
	await page.getByRole('button', { name: 'Confirm Cash Out' }).click();

	// Cash out player (E2E-Player-D) with 100 kr → net -100
	await page.getByRole('button', { name: 'Cash out E2E-Player-D' }).click();
	await page.getByPlaceholder('Final stack (kr)').fill('100');
	await page.getByRole('button', { name: 'Confirm Cash Out' }).click();

	// End session — click opens a confirmation sheet
	await page.getByRole('button', { name: 'End Session' }).click();
	// Wait for the confirmation sheet to open (same showModal timing as other sheets)
	await page.getByText('End the session?').waitFor({ state: 'visible', timeout: 5000 });
	// Intercept the closeSession PATCH before clicking so we don't miss it
	const sessionCloseResponse = page.waitForResponse(
		r => r.url().includes('/rest/v1/sessions') && r.request().method() === 'PATCH',
		{ timeout: 10000 }
	);
	// Click the confirm button inside the open sheet
	await page.getByRole('button', { name: 'End Session' }).last().click();
	// Wait for the DB write to complete — session is now 'closed'
	await sessionCloseResponse;
	// The Realtime event triggers goto('/end') but can be slow; navigate directly
	// now that we know the session is closed.
	await page.goto(`/session/${sessionId}/end`);
	await page.waitForLoadState('networkidle', { timeout: 15000 });

	// Settlement screen shows names and net results — use first() since names appear
	// multiple times (headline, results table, awards section, etc.)
	await expect(page.getByText('E2E-Host-D').first()).toBeVisible();
	await expect(page.getByText('E2E-Player-D').first()).toBeVisible();
	await expect(page.getByText('+100 kr').first()).toBeVisible();
	await expect(page.getByText('-100 kr').first()).toBeVisible();

	await page2.context().close();
});

test('refreshing the lobby URL while session is active redirects to /play', async ({ page, browser }) => {
	// Create a session, add a player, start it so state = 'active'
	const sessionUrl = await createSessionViaUI(page, 'E2E-Host-E');
	const sessionId = sessionIdFromUrl(sessionUrl);
	createdSessionIds.push(sessionId);

	await addPlayerViaHostSheet(page, 'E2E-Player-E');
	const page2 = await joinAsPlayer(browser, sessionUrl, 'E2E-Player-E');
	await expect(page.getByText('Ready ✓')).toHaveCount(2, { timeout: 8000 });
	await page.getByRole('button', { name: /Start Game/ }).click();
	await page.waitForURL(/\/play$/, { timeout: 10000 });

	// Now simulate a page refresh by navigating directly to the lobby URL
	await page.goto(`/session/${sessionId}`);

	// The server-side load should detect state=active and redirect to /play
	await page.waitForURL(/\/play$/, { timeout: 10000 });
	await expect(page.getByRole('button', { name: '1×' })).toBeVisible({ timeout: 8000 });

	await page2.context().close();
});

test('home screen redirects directly to /play when the only open session is already active', async ({ page, browser }) => {
	// Create a session, add a player, start it
	const sessionUrl = await createSessionViaUI(page, 'E2E-Host-F');
	const sessionId = sessionIdFromUrl(sessionUrl);
	createdSessionIds.push(sessionId);

	await addPlayerViaHostSheet(page, 'E2E-Player-F');
	const page2 = await joinAsPlayer(browser, sessionUrl, 'E2E-Player-F');
	await expect(page.getByText('Ready ✓')).toHaveCount(2, { timeout: 8000 });
	await page.getByRole('button', { name: /Start Game/ }).click();
	await page.waitForURL(/\/play$/, { timeout: 10000 });

	// Navigate to home — should bounce straight to /play, not the lobby
	await page.goto('/');
	await page.waitForURL(/\/play$/, { timeout: 10000 });
	await expect(page.getByRole('button', { name: '1×' })).toBeVisible({ timeout: 8000 });

	await page2.context().close();
});

test('leaderboard loads and shows correct structure', async ({ page }) => {
	await page.goto('/leaderboard');
	await expect(page.getByRole('heading', { name: 'Leaderboard' })).toBeVisible();

	// Either there are players listed (from prior test runs on the test DB)
	// or the empty-state message — both are valid since the DB is persistent
	const hasPlayers = await page.locator('.player-row').first().isVisible().catch(() => false);
	const hasEmpty = await page.getByText(/No completed sessions/i).isVisible().catch(() => false);
	expect(hasPlayers || hasEmpty).toBe(true);

	// Back to home link present
	await expect(page.getByRole('link', { name: /Back to home/i })).toBeVisible();
});

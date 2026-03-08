/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { Resend } from 'resend';

export default {
	async fetch(req, env, ctx): Promise<Response> {
		const resend = new Resend(env.RESEND_API_KEY);
		const payload = await req.text();

		try {
			const result = resend.webhooks.verify({
				payload,
				headers: {
					id: req.headers.get('svix-id') || '',
					timestamp: req.headers.get('svix-timestamp') || '',
					signature: req.headers.get('svix-signature') || '',
				},
				webhookSecret: env.RESEND_WEBHOOK_SECRET,
			});

			if (result.type !== 'email.received') {
				return new Response('OK');
			}

			await resend.emails.receiving.forward({
				emailId: result.data.email_id,
				to: env.FORWARD_TO_EMAIL,
				from: `${result.data.from.replace('@', '.at.')}+${env.FORWARD_FROM_EMAIL}`,
			});

			return new Response('OK Email Sent');
		} catch {
			return new Response('Invalid webhook', { status: 400 });
		}
	},
} satisfies ExportedHandler<Env>;

export default {
	async fetch(request) {
		const url = new URL(request.url);

		console.log("=== NEW REQUEST ===");
		console.log("Full URL:", request.url);
		console.log("Pathname:", url.pathname);

		// For workers.dev URL - pass through directly
		if (url.hostname.includes("workers.dev")) {
			const backendUrl = `https://matcheros-job-board-256459318270.us-central1.run.app${url.pathname}${url.search}`;
			return fetch(backendUrl, {
				method: request.method,
				headers: request.headers,
				body: request.body,
			});
		}

		// For matcheros.com - handle ALL job board routes
		if (url.hostname === "matcheros.com") {
			// ALL the routes your job board React app uses
			const jobBoardRoutes = [
				"/jobs",
				"/signup", // Job board signup (NOT main site beta)
				"/login", // If you have login
				"/apply", // Job application
				"/dashboard", // User dashboard
				"/profile", // User profile
				"/settings", // User settings
				"/saved", // Saved jobs
				"/applications", // My applications
			];

			// Check if this is a job board route or static asset
			const isJobBoardRoute = jobBoardRoutes.some(
				(route) =>
					url.pathname === route || url.pathname.startsWith(route + "/"),
			);

			// Also handle job detail pages like /job/123
			const isJobDetail = url.pathname.match(/^\/job\/\d+/);

			// Static assets (JS, CSS, images)
			const isStaticAsset = url.pathname.match(
				/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webp|json|map)$/,
			);

			// Also handle /assets/ paths
			const isAssetPath = url.pathname.startsWith("/assets/");

			if (
				isJobBoardRoute ||
				isJobDetail ||
				isStaticAsset ||
				isAssetPath ||
				url.pathname.startsWith("/jobs")
			) {
				// Build backend URL - remove /jobs prefix if present
				let backendPath = url.pathname;
				if (backendPath.startsWith("/jobs")) {
					backendPath = backendPath.substring(5) || "/";
				}

				const backendUrl = `https://matcheros-job-board-256459318270.us-central1.run.app${backendPath}${url.search}`;
				console.log("Proxying to:", backendUrl);

				const response = await fetch(backendUrl, {
					method: request.method,
					headers: request.headers,
					body: request.body,
				});

				const contentType = response.headers.get("content-type");

				// SPA FALLBACK: If 404 and not a static asset, serve index.html
				if (response.status === 404 && !isStaticAsset) {
					console.log("SPA fallback for:", url.pathname);
					const indexResponse = await fetch(
						`https://matcheros-job-board-256459318270.us-central1.run.app/`,
					);
					let html = await indexResponse.text();
					html = html.replace(/(src|href)=["']\/(?!\/)/g, `$1="/jobs/`);
					return new Response(html, {
						status: 200,
						headers: { "Content-Type": "text/html" },
					});
				}

				// Rewrite HTML asset paths
				if (contentType && contentType.includes("text/html")) {
					let html = await response.text();
					html = html.replace(/(src|href)=["']\/(?!\/)/g, `$1="/jobs/`);
					return new Response(html, {
						status: response.status,
						headers: {
							"Content-Type": "text/html",
							"Cache-Control": "no-cache",
						},
					});
				}

				return response;
			}
		}

		// Redirect root to /jobs
		if (url.hostname === "matcheros.com" && url.pathname === "/") {
			return Response.redirect("https://matcheros.com/jobs", 302);
		}

		// All other requests go to main website
		return fetch(request);
	},
};

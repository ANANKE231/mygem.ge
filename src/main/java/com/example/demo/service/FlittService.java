package com.example.demo.service;

import com.example.demo.config.AppProperties;
import com.example.demo.web.ApiException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
public class FlittService {

	private static final Logger log = LoggerFactory.getLogger(FlittService.class);
	private static final URI CHECKOUT_URL = URI.create("https://pay.flitt.com/api/checkout/url");
	private static final int PLAN_VIP_TETRI = 200;
	private static final int PLAN_SVIP_TETRI = 200;
	private static final int COLOR_TETRI = 200;
	private static final int STICKER_TETRI = 200;

	private final AppProperties props;
	private final ObjectMapper json;
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

	public FlittService(AppProperties props, ObjectMapper json) {
		this.props = props;
		this.json = json;
	}

	public boolean ready() {
		return props.getFlittMerchantId() > 0 && props.getFlittPaymentKey() != null && !props.getFlittPaymentKey().isBlank();
	}

	public Map<String, Object> config() {
		Map<String, Object> out = new LinkedHashMap<>();
		out.put("ok", true);
		out.put("ready", ready());
		out.put("currency", "GEL");
		out.put("companyName", props.getCompanyName());
		out.put("companyId", props.getCompanyId() == null ? "" : props.getCompanyId());
		out.put("companyPhone", props.getCompanyPhone());
		out.put("companyEmail", props.getCompanyEmail());
		out.put("companyAddress", props.getCompanyAddress());
		out.put("companyIban", props.getCompanyIban());
		return out;
	}

	public int amountTetri(JsonNode pay) {
		if (pay == null || !pay.isObject()) {
			return 0;
		}
		int total = 0;
		String plan = pay.path("plan").asText("");
		if ("VIP".equalsIgnoreCase(plan)) {
			total += PLAN_VIP_TETRI;
		} else if ("SUPER VIP".equalsIgnoreCase(plan) || "SVIP".equalsIgnoreCase(plan)) {
			total += PLAN_SVIP_TETRI;
		}
		if (pay.path("color").asBoolean(false)) {
			total += COLOR_TETRI;
		}
		if (pay.path("sticker").asBoolean(false)) {
			int n = pay.path("stkN").asInt(0);
			if (n <= 0 && pay.path("stickers").isArray()) {
				n = pay.path("stickers").size();
			}
			n = Math.max(0, Math.min(3, n));
			total += n * STICKER_TETRI;
		}
		return total;
	}

	public String createCheckoutUrl(String orderId, String orderDesc, int amountTetri, String responseUrl, String callbackUrl) {
		if (!ready()) {
			throw new ApiException(503, "flitt_not_configured", "ონლაინ გადახდა ჯერ არ არის ჩართული");
		}
		if (amountTetri <= 0) {
			throw new ApiException(400, "bad_request", "გადასახდელი თანხა არასწორია");
		}
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("merchant_id", props.getFlittMerchantId());
		request.put("order_id", orderId);
		request.put("order_desc", orderDesc);
		request.put("amount", amountTetri);
		request.put("currency", "GEL");
		request.put("response_url", responseUrl);
		request.put("server_callback_url", callbackUrl);
		request.put("signature", FlittSignature.sign(props.getFlittPaymentKey(), request));

		ObjectNode body = json.createObjectNode();
		body.set("request", json.valueToTree(request));
		try {
			HttpRequest httpRequest = HttpRequest.newBuilder(CHECKOUT_URL)
					.timeout(Duration.ofSeconds(30))
					.header("Content-Type", "application/json")
					.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
					.build();
			HttpResponse<String> response = http.send(httpRequest, HttpResponse.BodyHandlers.ofString());
			JsonNode root = json.readTree(response.body());
			JsonNode resp = root.path("response");
			if (!"success".equals(resp.path("response_status").asText(""))) {
				String message = resp.path("error_message").asText("Flitt გადახდა ვერ დაიწყო");
				log.warn("flitt checkout failed: {}", message);
				throw new ApiException(502, "flitt_error", message);
			}
			String checkout = resp.path("checkout_url").asText("").trim();
			if (checkout.isBlank()) {
				throw new ApiException(502, "flitt_error", "Flitt გადახდა ვერ დაიწყო");
			}
			return checkout;
		} catch (ApiException ex) {
			throw ex;
		} catch (Exception ex) {
			log.warn("flitt checkout request failed", ex);
			throw new ApiException(502, "flitt_error", "Flitt სერვერთან დაკავშირება ვერ მოხერხდა");
		}
	}

	public boolean validCallback(Map<String, Object> params) {
		if (!ready()) {
			return false;
		}
		Object signature = params.get("signature");
		return FlittSignature.matches(props.getFlittPaymentKey(), params, signature == null ? null : String.valueOf(signature));
	}

	public String publicBase() {
		String base = props.getPublicBaseUrl();
		if (base == null || base.isBlank()) {
			return "https://mygem.ge";
		}
		return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
	}

	public static String gelText(int tetri) {
		return String.format(Locale.ROOT, "%.2f", tetri / 100.0);
	}
}

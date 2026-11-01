package com.example.demo.web;

import com.example.demo.service.MailService;
import tools.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class FeedbackController {

	private final MailService mail;

	public FeedbackController(MailService mail) {
		this.mail = mail;
	}

	@PostMapping("/api/feedback")
	public Map<String, Object> feedback(@RequestBody JsonNode body) {
		if (body == null || !body.isObject()) {
			throw new ApiException(400, "bad_request", "მოთხოვნა არასწორია");
		}
		String kind = text(body, "kind");
		if (kind.isBlank()) {
			kind = "review";
		}
		if (!"review".equals(kind) && !"call".equals(kind)) {
			throw new ApiException(400, "bad_request", "მოთხოვნა არასწორია");
		}
		Map<String, String> fields = new LinkedHashMap<>();
		String subject;
		if ("call".equals(kind)) {
			String name = text(body, "name");
			String phone = text(body, "phone");
			if (name.length() < 2) {
				throw new ApiException(400, "bad_request", "შეიყვანეთ სახელი");
			}
			String digits = phone.replaceAll("\\D", "");
			if (!phone.matches("\\+?[0-9\\s-]+") || digits.length() < 9 || digits.length() > 15) {
				throw new ApiException(400, "bad_request", "არასწორი ტელეფონის ნომერი");
			}
			fields.put("სახელი", name);
			fields.put("ტელეფონი", phone);
			fields.put("დრო", orDash(text(body, "when")));
			fields.put("შეტყობინება", orDash(text(body, "message")));
			subject = "ზარის მოთხოვნა";
		} else {
			int stars = body.path("stars").asInt(0);
			if (stars < 1 || stars > 5) {
				throw new ApiException(400, "bad_request", "აირჩიეთ შეფასება");
			}
			String comment = text(body, "comment");
			if (comment.length() > 1000) {
				comment = comment.substring(0, 1000);
			}
			String contact = text(body, "contact");
			if (contact.length() > 80) {
				contact = contact.substring(0, 80);
			}
			fields.put("შეფასება", stars + " / 5");
			fields.put("კომენტარი", orDash(comment));
			fields.put("კონტაქტი", orDash(contact));
			subject = "შეფასება " + stars + "/5";
		}
		String page = text(body, "page");
		if (!page.isBlank()) {
			fields.put("გვერდი", page.length() > 500 ? page.substring(0, 500) : page);
		}
		try {
			mail.sendFeedback(subject, fields);
		} catch (Exception e) {
			throw new ApiException(503, "mail_failed", "გაგზავნა ვერ მოხერხდა, სცადეთ თავიდან");
		}
		return Map.of("ok", true, "message", "გაგზავნილია, მადლობა!");
	}

	private static String text(JsonNode body, String field) {
		JsonNode value = body.get(field);
		if (value == null || value.isNull()) {
			return "";
		}
		return value.asText("").trim();
	}

	private static String orDash(String value) {
		return value == null || value.isBlank() ? "—" : value;
	}
}

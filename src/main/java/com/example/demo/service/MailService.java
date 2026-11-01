package com.example.demo.service;

import com.example.demo.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
public class MailService {

	private static final Logger log = LoggerFactory.getLogger(MailService.class);

	private final AppProperties props;
	private final ObjectProvider<JavaMailSender> mailSender;
	private final String mailHost;
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
	private final ConcurrentLinkedQueue<Map<String, String>> sent = new ConcurrentLinkedQueue<>();

	public MailService(AppProperties props, ObjectProvider<JavaMailSender> mailSender,
			@Value("${spring.mail.host:}") String mailHost) {
		this.props = props;
		this.mailSender = mailSender;
		this.mailHost = mailHost == null ? "" : mailHost.trim();
	}

	public boolean smtpReady() {
		return !mailHost.isBlank() && mailSender.getIfAvailable() != null;
	}

	public boolean ready() {
		return props.isMailLogOnly() || smtpReady();
	}

	public void sendText(String to, String subject, String body) {
		if (to == null || to.isBlank()) {
			throw new IllegalArgumentException("missing to");
		}
		Map<String, String> copy = new LinkedHashMap<>();
		copy.put("to", to.trim());
		copy.put("subject", subject == null ? "" : subject);
		copy.put("body", body == null ? "" : body);
		sent.add(copy);
		while (sent.size() > 50) {
			sent.poll();
		}
		if (props.isMailLogOnly()) {
			log.info("mail-log-only to={} subject={}", to, subject);
			return;
		}
		if (!smtpReady()) {
			throw new IllegalStateException("mail_not_configured");
		}
		SimpleMailMessage message = new SimpleMailMessage();
		String from = blank(props.getCompanyEmail()) ? "noreply@mygem.ge" : props.getCompanyEmail();
		message.setFrom(from);
		message.setTo(to.trim());
		message.setSubject(subject);
		message.setText(body);
		mailSender.getObject().send(message);
	}

	/** Deliver site feedback to the company inbox (SMTP, else FormSubmit). */
	public void sendFeedback(String subject, Map<String, String> fields) {
		String to = blank(props.getCompanyEmail()) ? "mygemge@gmail.com" : props.getCompanyEmail();
		StringBuilder body = new StringBuilder();
		if (fields != null) {
			fields.forEach((k, v) -> body.append(k).append(": ").append(v == null ? "" : v).append('\n'));
		}
		if (props.isMailLogOnly() || smtpReady()) {
			sendText(to, subject, body.toString());
			return;
		}
		try {
			sendViaFormSubmit(to, subject, fields == null ? Map.of() : fields);
		} catch (Exception e) {
			log.error("feedback email failed", e);
			throw new IllegalStateException("mail_failed", e);
		}
	}

	private void sendViaFormSubmit(String to, String subject, Map<String, String> fields) throws Exception {
		StringBuilder json = new StringBuilder(256);
		json.append("{\"_subject\":").append(jsonString("mygem.ge — " + subject));
		json.append(",\"_template\":\"table\",\"_captcha\":\"false\"");
		for (Map.Entry<String, String> e : fields.entrySet()) {
			json.append(',').append(jsonString(e.getKey())).append(':').append(jsonString(e.getValue() == null ? "" : e.getValue()));
		}
		json.append('}');
		HttpRequest request = HttpRequest.newBuilder(URI.create("https://formsubmit.co/ajax/" + URLEncoder.encode(to, StandardCharsets.UTF_8)))
				.timeout(Duration.ofSeconds(20))
				.header("Content-Type", "application/json")
				.header("Accept", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(json.toString()))
				.build();
		HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
		if (response.statusCode() >= 300) {
			throw new IllegalStateException("formsubmit " + response.statusCode());
		}
	}

	private static String jsonString(String value) {
		StringBuilder out = new StringBuilder("\"");
		for (int i = 0; i < value.length(); i++) {
			char c = value.charAt(i);
			switch (c) {
				case '\\' -> out.append("\\\\");
				case '"' -> out.append("\\\"");
				case '\n' -> out.append("\\n");
				case '\r' -> out.append("\\r");
				case '\t' -> out.append("\\t");
				default -> {
					if (c < 0x20) {
						out.append(String.format("\\u%04x", (int) c));
					} else {
						out.append(c);
					}
				}
			}
		}
		return out.append('"').toString();
	}

	private static boolean blank(String value) {
		return value == null || value.isBlank();
	}

	public ConcurrentLinkedQueue<Map<String, String>> sent() {
		return sent;
	}
}

package com.example.demo.security;

import com.example.demo.config.AppProperties;
import com.example.demo.model.LoginSession;
import com.example.demo.repo.LoginSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class SessionService {

	private final LoginSessionRepository sessions;
	private final TokenService tokens;
	private final AppProperties props;
	private final SecureRandom random = new SecureRandom();

	public SessionService(LoginSessionRepository sessions, TokenService tokens, AppProperties props) {
		this.sessions = sessions;
		this.tokens = tokens;
		this.props = props;
	}

	@Transactional
	public String open(String email) {
		sessions.deleteByEmailIgnoreCase(email);
		byte[] bytes = new byte[16];
		random.nextBytes(bytes);
		LoginSession session = new LoginSession();
		session.setId(HexFormat.of().formatHex(bytes));
		session.setEmail(email.toLowerCase());
		long exp = Instant.now().getEpochSecond() + props.getTokenDays() * 24L * 60L * 60L;
		session.setExpiresAt(exp);
		sessions.save(session);
		return tokens.issue(session.getId(), exp);
	}

	public String email(String token) {
		String id = tokens.sessionId(token);
		if (id == null) {
			return null;
		}
		LoginSession session = sessions.findById(id).orElse(null);
		if (session == null || session.getExpiresAt() < Instant.now().getEpochSecond()) {
			return null;
		}
		return session.getEmail();
	}

	@Transactional
	public void revokeEmail(String email) {
		if (email != null && !email.isBlank()) {
			sessions.deleteByEmailIgnoreCase(email);
		}
	}

	@Transactional
	public void revoke(String token) {
		String id = token == null ? null : tokens.sessionId(token);
		if (id != null) {
			sessions.deleteById(id);
		}
	}

}

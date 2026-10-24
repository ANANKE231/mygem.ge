package com.example.demo.service;

import com.example.demo.config.AppProperties;
import com.example.demo.model.Account;
import com.example.demo.repo.AccountRepository;
import com.example.demo.security.TokenService;
import com.example.demo.web.ApiException;
import tools.jackson.databind.JsonNode;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class AuthService {

	private static final Set<String> REG_TYPES = Set.of("individual", "store", "brand", "other");
	private static final Pattern EMAIL = Pattern.compile("^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\\.)+[A-Za-z]{2,}$");
	private static final Pattern USERNAME = Pattern.compile("^[A-Za-z0-9._-]{3,20}$");
	private static final int MAX_AVATAR = 5_000_000;

	private final AccountRepository accounts;
	private final PasswordEncoder encoder;
	private final TokenService tokens;
	private final AppProperties props;
	private final CatalogService catalog;
	private final GoogleIdTokenVerifier googleTokens;

	public AuthService(AccountRepository accounts, PasswordEncoder encoder, TokenService tokens, AppProperties props, CatalogService catalog, GoogleIdTokenVerifier googleTokens) {
		this.accounts = accounts;
		this.encoder = encoder;
		this.tokens = tokens;
		this.props = props;
		this.catalog = catalog;
		this.googleTokens = googleTokens;
	}

	@Transactional
	public Map<String, Object> register(JsonNode body) {
		requireObject(body);
		String regType = text(body, "regType");
		if (!REG_TYPES.contains(regType)) {
			throw bad("bad_request", "აირჩიეთ რეგისტრაციის ტიპი");
		}
		boolean individual = "individual".equals(regType);
		String name = text(body, "name");
		String last = text(body, "last");
		String email = text(body, "email").toLowerCase(Locale.ROOT);
		String username = text(body, "username");
		String phone = text(body, "phone");
		String password = raw(body, "pass");
		String regOther = text(body, "regOther");

		if (name.length() < 2) {
			throw bad("bad_request", individual ? "შეიყვანეთ სახელი" : "შეიყვანეთ დასახელება");
		}
		if (individual && last.length() < 2) {
			throw bad("bad_request", "შეიყვანეთ გვარი");
		}
		if ("other".equals(regType) && regOther.isBlank()) {
			throw bad("bad_request", "მიუთითეთ რეგისტრაციის ტიპი");
		}
		if (!EMAIL.matcher(email).matches() || email.length() > 254) {
			throw bad("bad_request", "არასწორი ელ-ფოსტა (მაგ: name@mail.com)");
		}
		if (accounts.existsByEmailIgnoreCase(email)) {
			throw bad("email_taken", "ეს ელ-ფოსტა დაკავებულია");
		}
		if (!USERNAME.matcher(username).matches()) {
			throw bad("bad_request", "3–20 სიმბოლო: ლათინური ასოები, ციფრები, . _ -");
		}
		if (accounts.existsByUsernameIgnoreCase(username)) {
			throw bad("username_taken", "ეს მომხმარებლის სახელი დაკავებულია");
		}
		String phoneProblem = phoneProblem(phone);
		if (phoneProblem != null) {
			throw bad("bad_request", phoneProblem);
		}
		if (phoneTaken(phone, null)) {
			throw bad("phone_taken", "ეს ნომერი უკვე გამოყენებულია");
		}
		String passwordProblem = passwordProblem(password);
		if (passwordProblem != null) {
			throw bad("bad_request", passwordProblem);
		}

		Account account = new Account();
		account.setEmail(email);
		account.setUsername(username);
		account.setPasswordHash(encoder.encode(password));
		account.setPhone(phone);
		account.setName(name);
		account.setLastName(individual ? last : "");
		account.setRegType(regType);
		account.setRegOther("other".equals(regType) ? regOther : "");
		account.setShop(!individual);
		account.setCreated(body.path("created").isNumber() ? body.path("created").asLong() : System.currentTimeMillis());
		return session(accounts.save(account));
	}

	@Transactional(readOnly = true)
	public Map<String, Object> login(JsonNode body) {
		requireObject(body);
		String login = text(body, "login");
		String password = raw(body, "password");
		if (login.isBlank()) {
			throw bad("bad_request", "შეიყვანეთ ელ-ფოსტა ან მომხმარებლის სახელი");
		}
		if (password.isBlank()) {
			throw bad("bad_request", "შეიყვანეთ პაროლი");
		}
		Account account = accounts.findByEmailIgnoreCase(login)
				.or(() -> accounts.findByUsernameIgnoreCase(login))
				.orElse(null);
		if (account != null && account.getPasswordHash() == null && account.getGoogleSub() != null) {
			throw new ApiException(401, "google_only", "ეს ანგარიში Google-ით არის შექმნილი — გამოიყენეთ „Continue with Google“.");
		}
		if (account == null || account.getPasswordHash() == null || !encoder.matches(password, account.getPasswordHash())) {
			throw new ApiException(401, "bad_credentials", "ელ-ფოსტა/მომხმარებლის სახელი ან პაროლი არასწორია");
		}
		return session(account);
	}

	@Transactional
	public Map<String, Object> forgot(JsonNode body) {
		requireObject(body);
		String email = text(body, "email").toLowerCase(Locale.ROOT);
		String password = raw(body, "password");
		if (!EMAIL.matcher(email).matches()) {
			throw bad("bad_request", "არასწორი ელ-ფოსტა (მაგ: name@mail.com)");
		}
		Account account = accounts.findByEmailIgnoreCase(email)
				.orElseThrow(() -> bad("not_found", "ასეთი ელ-ფოსტა ვერ მოიძებნა"));
		if (account.getPasswordHash() == null && account.getGoogleSub() != null) {
			throw bad("google_only", "ეს ანგარიში Google-ით არის შექმნილი — გამოიყენეთ „Continue with Google“.");
		}
		String passwordProblem = passwordProblem(password);
		if (passwordProblem != null) {
			throw bad("bad_request", passwordProblem);
		}
		account.setPasswordHash(encoder.encode(password));
		return Map.of("ok", true);
	}

	@Transactional(readOnly = true)
	public Map<String, Object> checkPassword(String email, JsonNode body) {
		requireObject(body);
		Account account = requireAccount(email);
		String password = raw(body, "password");
		if (account.getPasswordHash() == null || !encoder.matches(password, account.getPasswordHash())) {
			throw new ApiException(401, "bad_password", "პაროლი არასწორია");
		}
		return Map.of("ok", true);
	}

	@Transactional
	public Map<String, Object> updateProfile(String email, JsonNode body) {
		requireObject(body);
		Account account = requireAccount(email);
		String regType = text(body, "regType").isBlank() ? account.getRegType() : text(body, "regType");
		if (!REG_TYPES.contains(regType)) {
			throw bad("bad_request", "აირჩიეთ რეგისტრაციის ტიპი");
		}
		boolean individual = "individual".equals(regType);
		String name = body.has("name") ? text(body, "name") : account.getName();
		String last = body.has("last") ? text(body, "last") : empty(account.getLastName());
		String nextEmail = body.has("email") ? text(body, "email").toLowerCase(Locale.ROOT) : account.getEmail();
		String username = body.has("username") ? text(body, "username") : empty(account.getUsername());
		String phone = body.has("phone") ? text(body, "phone") : empty(account.getPhone());
		String regOther = body.has("regOther") ? text(body, "regOther") : empty(account.getRegOther());
		String newPassword = raw(body, "password");
		String currentPassword = raw(body, "currentPassword");

		if (name.length() < 2) {
			throw bad("bad_request", individual ? "შეიყვანეთ სახელი" : "შეიყვანეთ დასახელება");
		}
		if (individual && last.length() < 2) {
			throw bad("bad_request", "შეიყვანეთ გვარი");
		}
		if ("other".equals(regType) && regOther.isBlank()) {
			throw bad("bad_request", "მიუთითეთ რეგისტრაციის ტიპი");
		}
		if (!EMAIL.matcher(nextEmail).matches()) {
			throw bad("bad_request", "არასწორი ელ-ფოსტა (მაგ: name@mail.com)");
		}
		if (!username.isBlank() && !USERNAME.matcher(username).matches()) {
			throw bad("bad_request", "3–20 სიმბოლო: ლათინური ასოები, ციფრები, . _ -");
		}
		String phoneProblem = phoneProblem(phone);
		if (phoneProblem != null) {
			throw bad("bad_request", phoneProblem);
		}
		boolean emailChange = !nextEmail.equalsIgnoreCase(account.getEmail());
		boolean passwordChange = !newPassword.isBlank();
		if ((emailChange || passwordChange) && account.getPasswordHash() != null && !encoder.matches(currentPassword, account.getPasswordHash())) {
			throw bad("bad_password", "პაროლი არასწორია");
		}
		if (passwordChange) {
			String passwordProblem = passwordProblem(newPassword);
			if (passwordProblem != null) {
				throw bad("bad_request", passwordProblem);
			}
		}
		if (emailChange && accounts.existsByEmailIgnoreCase(nextEmail)) {
			throw bad("email_taken", "ეს ელ-ფოსტა დაკავებულია");
		}
		if (!username.isBlank() && !username.equalsIgnoreCase(empty(account.getUsername())) && accounts.existsByUsernameIgnoreCase(username)) {
			throw bad("username_taken", "ეს მომხმარებლის სახელი დაკავებულია");
		}
		if (phoneTaken(phone, account.getId())) {
			throw bad("phone_taken", "ეს ნომერი უკვე გამოყენებულია");
		}
		if (body.has("avatar")) {
			String avatar = raw(body, "avatar");
			if (avatar.length() > MAX_AVATAR) {
				throw bad("too_large", "ფოტო ძალიან დიდია");
			}
			account.setAvatar(avatar);
		}
		if (body.has("avatarOff")) {
			account.setAvatarOff(body.path("avatarOff").asBoolean(false));
		}

		String previousEmail = account.getEmail();
		account.setRegType(regType);
		account.setRegOther("other".equals(regType) ? regOther : "");
		account.setShop(body.has("shop") ? body.path("shop").asBoolean(!individual) : !individual);
		account.setName(name);
		account.setLastName(individual ? last : "");
		account.setPhone(phone);
		account.setUsername(username.isBlank() ? null : username);
		if (passwordChange) {
			account.setPasswordHash(encoder.encode(newPassword));
		}
		if (emailChange) {
			account.setEmail(nextEmail);
			catalog.moveOwner(previousEmail, nextEmail);
		}
		Map<String, Object> out = new LinkedHashMap<>();
		out.put("ok", true);
		out.put("token", tokens.issue(account.getEmail()));
		out.put("user", toPublic(account));
		return out;
	}

	@Transactional
	public Map<String, Object> google(JsonNode body) {
		requireObject(body);
		String action = text(body, "action");
		if ("auth_config".equals(action)) {
			String clientId = empty(props.getGoogleClientId()).trim();
			Map<String, Object> out = new LinkedHashMap<>();
			out.put("ok", true);
			out.put("ready", !clientId.isBlank());
			out.put("clientId", clientId);
			return out;
		}
		if (!"google_auth".equals(action)) {
			throw bad("bad_request", "მოთხოვნა არასწორია");
		}
		String clientId = empty(props.getGoogleClientId()).trim();
		if (clientId.isBlank()) {
			throw new ApiException(503, "google_not_configured", "Google-ით შესვლა ამჟამად მიუწვდომელია");
		}
		GoogleIdTokenVerifier.GoogleProfile profile = googleTokens.verify(raw(body, "credential"), clientId);
		Account account = accounts.findByGoogleSub(profile.sub()).orElse(null);
		if (account == null) {
			account = accounts.findByEmailIgnoreCase(profile.email()).orElse(null);
			if (account == null) {
				account = newGoogleAccount(profile);
			} else if (account.getGoogleSub() != null && !account.getGoogleSub().isBlank() && !account.getGoogleSub().equals(profile.sub())) {
				throw new ApiException(409, "email_linked", "ეს ელ-ფოსტა სხვა Google ანგარიშთანაა დაკავშირებული");
			} else {
				account.setGoogleSub(profile.sub());
				if ((account.getAvatar() == null || account.getAvatar().isBlank()) && !account.isAvatarOff() && !profile.picture().isBlank()) {
					account.setAvatar(profile.picture());
				}
			}
		}
		Map<String, Object> out = session(accounts.save(account));
		Map<String, Object> publicProfile = new LinkedHashMap<>();
		publicProfile.put("sub", profile.sub());
		publicProfile.put("email", profile.email());
		publicProfile.put("name", profile.name());
		publicProfile.put("given", profile.given());
		publicProfile.put("family", profile.family());
		publicProfile.put("picture", profile.picture());
		out.put("profile", publicProfile);
		return out;
	}

	private Account newGoogleAccount(GoogleIdTokenVerifier.GoogleProfile profile) {
		String given = !profile.given().isBlank() ? profile.given() : profile.name();
		if (given.length() < 2) {
			String local = profile.email().split("@", 2)[0];
			given = local.length() >= 2 ? local : "Google";
		}
		if (given.length() > 120) {
			given = given.substring(0, 120);
		}
		String family = profile.family().length() > 120 ? profile.family().substring(0, 120) : profile.family();
		Account account = new Account();
		account.setEmail(profile.email());
		account.setName(given);
		account.setLastName(family);
		account.setRegType("individual");
		account.setRegOther("");
		account.setShop(false);
		account.setAvatarOff(false);
		account.setPhone("");
		account.setGoogleSub(profile.sub());
		account.setAvatar(profile.picture());
		account.setCreated(System.currentTimeMillis());
		return account;
	}

	@Transactional(readOnly = true)
	public Map<String, Object> me(String email) {
		Account account = requireAccount(email);
		Map<String, Object> out = new LinkedHashMap<>();
		out.put("ok", true);
		out.put("user", toPublic(account));
		out.put("favs", catalog.favIds(email));
		out.put("notes", catalog.notesFor(email));
		out.put("admin", props.isAdmin(email));
		return out;
	}

	@Transactional(readOnly = true)
	public Map<String, Object> publicUsers() {
		List<Map<String, Object>> users = accounts.findAll().stream().map(this::toPublic).toList();
		return Map.of("ok", true, "users", users);
	}

	public Map<String, Object> toPublic(Account account) {
		Map<String, Object> user = new LinkedHashMap<>();
		user.put("email", account.getEmail());
		user.put("username", empty(account.getUsername()));
		user.put("name", account.getName());
		user.put("last", empty(account.getLastName()));
		user.put("phone", empty(account.getPhone()));
		user.put("regType", account.getRegType());
		user.put("regOther", empty(account.getRegOther()));
		user.put("shop", account.isShop());
		user.put("avatar", account.isAvatarOff() ? "" : empty(account.getAvatar()));
		user.put("avatarOff", account.isAvatarOff());
		user.put("created", account.getCreated() == null ? 0 : account.getCreated());
		user.put("hasPass", account.getPasswordHash() != null);
		if (account.getGoogleSub() != null && !account.getGoogleSub().isBlank()) {
			user.put("google", Map.of("sub", account.getGoogleSub()));
		}
		return user;
	}

	private Account requireAccount(String email) {
		if (email == null || email.isBlank()) {
			throw new ApiException(401, "unauthorized", "შედით ანგარიშში");
		}
		return accounts.findByEmailIgnoreCase(email)
				.orElseThrow(() -> new ApiException(401, "unauthorized", "შედით ანგარიშში"));
	}

	private Map<String, Object> session(Account account) {
		Map<String, Object> out = new LinkedHashMap<>();
		out.put("ok", true);
		out.put("token", tokens.issue(account.getEmail()));
		out.put("user", toPublic(account));
		return out;
	}

	private boolean phoneTaken(String phone, Long exceptId) {
		String tail = tail(phone);
		return accounts.findAll().stream().anyMatch(account ->
				(exceptId == null || !exceptId.equals(account.getId())) && tail(account.getPhone()).equals(tail));
	}

	private static String tail(String phone) {
		String digits = phone == null ? "" : phone.replaceAll("\\D", "");
		return digits.length() <= 9 ? digits : digits.substring(digits.length() - 9);
	}

	private static String phoneProblem(String phone) {
		if (phone == null || phone.isBlank()) {
			return "შეიყვანეთ ტელეფონი";
		}
		String digits = phone.replaceAll("\\D", "");
		if (!phone.matches("\\+?[0-9\\s-]+") || digits.length() < 9 || digits.length() > 15) {
			return "არასწორი ტელეფონის ნომერი";
		}
		return null;
	}

	static String passwordProblem(String password) {
		if (password == null || password.isBlank()) {
			return "შეიყვანეთ პაროლი";
		}
		if (password.length() < 8) {
			return "პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს";
		}
		if (password.length() > 200) {
			return "პაროლი ძალიან გრძელია";
		}
		if (!password.matches(".*[A-Za-z\\u10A0-\\u10FF].*") || !password.matches(".*\\d.*")) {
			return "პაროლი უნდა შეიცავდეს ასოსაც და ციფრსაც";
		}
		return null;
	}

	private static void requireObject(JsonNode body) {
		if (body == null || !body.isObject()) {
			throw bad("bad_request", "მოთხოვნა არასწორია");
		}
	}

	private static String text(JsonNode body, String field) {
		return raw(body, field).trim();
	}

	private static String raw(JsonNode body, String field) {
		JsonNode value = body.get(field);
		if (value == null || value.isNull()) {
			return "";
		}
		return value.asText("");
	}

	private static String empty(String value) {
		return value == null ? "" : value;
	}

	private static ApiException bad(String code, String message) {
		return new ApiException(400, code, message);
	}

}

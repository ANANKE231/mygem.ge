package com.example.demo.config;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Arrays;
import java.util.Locale;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

	private String tokenSecret;
	private int tokenDays = 14;
	private String adminEmails = "";
	private String googleClientId = "";
	private String r2AccessKeyId = "";
	private String r2SecretAccessKey = "";
	private String r2Endpoint = "";
	private String r2Bucket = "";
	private String r2PublicBase = "";
	private long flittMerchantId;
	private String flittPaymentKey = "";
	private String flittCreditKey = "";
	private String publicBaseUrl = "https://mygem.ge";
	private String companyName = "მიკრო მეწარმე გიორგი მინდიაშვლი";
	private String companyId = "";
	private String companyPhone = "574173203";
	private String companyEmail = "mygemge@gmail.com";
	private String companyAddress = "თბილისი, საქართველო";
	private String companyIban = "GE56TB7046245064300117";

	@PostConstruct
	void check() {
		if (tokenSecret == null || tokenSecret.length() < 16) {
			throw new IllegalStateException("app.token-secret must be at least 16 characters");
		}
		if (adminEmails == null || adminEmails.isBlank()) {
			throw new IllegalStateException("app.admin-emails must be set");
		}
	}

	public boolean isAdmin(String email) {
		if (email == null || email.isBlank()) {
			return false;
		}
		String needle = email.trim().toLowerCase(Locale.ROOT);
		return Arrays.stream(adminEmails.split(","))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.map(s -> s.toLowerCase(Locale.ROOT))
				.anyMatch(needle::equals);
	}

	public String getTokenSecret() {
		return tokenSecret;
	}

	public void setTokenSecret(String tokenSecret) {
		this.tokenSecret = tokenSecret;
	}

	public int getTokenDays() {
		return tokenDays;
	}

	public void setTokenDays(int tokenDays) {
		this.tokenDays = tokenDays;
	}

	public String getAdminEmails() {
		return adminEmails;
	}

	public void setAdminEmails(String adminEmails) {
		this.adminEmails = adminEmails;
	}

	public String getGoogleClientId() {
		return googleClientId;
	}

	public void setGoogleClientId(String googleClientId) {
		this.googleClientId = googleClientId;
	}

	public String getR2AccessKeyId() {
		return r2AccessKeyId;
	}

	public void setR2AccessKeyId(String r2AccessKeyId) {
		this.r2AccessKeyId = r2AccessKeyId;
	}

	public String getR2SecretAccessKey() {
		return r2SecretAccessKey;
	}

	public void setR2SecretAccessKey(String r2SecretAccessKey) {
		this.r2SecretAccessKey = r2SecretAccessKey;
	}

	public String getR2Endpoint() {
		return r2Endpoint;
	}

	public void setR2Endpoint(String r2Endpoint) {
		this.r2Endpoint = r2Endpoint;
	}

	public String getR2Bucket() {
		return r2Bucket;
	}

	public void setR2Bucket(String r2Bucket) {
		this.r2Bucket = r2Bucket;
	}

	public String getR2PublicBase() {
		return r2PublicBase;
	}

	public void setR2PublicBase(String r2PublicBase) {
		this.r2PublicBase = r2PublicBase;
	}

	public long getFlittMerchantId() {
		return flittMerchantId;
	}

	public void setFlittMerchantId(long flittMerchantId) {
		this.flittMerchantId = flittMerchantId;
	}

	public String getFlittPaymentKey() {
		return flittPaymentKey;
	}

	public void setFlittPaymentKey(String flittPaymentKey) {
		this.flittPaymentKey = flittPaymentKey;
	}

	public String getFlittCreditKey() {
		return flittCreditKey;
	}

	public void setFlittCreditKey(String flittCreditKey) {
		this.flittCreditKey = flittCreditKey;
	}

	public String getPublicBaseUrl() {
		return publicBaseUrl;
	}

	public void setPublicBaseUrl(String publicBaseUrl) {
		this.publicBaseUrl = publicBaseUrl;
	}

	public String getCompanyName() {
		return companyName;
	}

	public void setCompanyName(String companyName) {
		this.companyName = companyName;
	}

	public String getCompanyId() {
		return companyId;
	}

	public void setCompanyId(String companyId) {
		this.companyId = companyId;
	}

	public String getCompanyPhone() {
		return companyPhone;
	}

	public void setCompanyPhone(String companyPhone) {
		this.companyPhone = companyPhone;
	}

	public String getCompanyEmail() {
		return companyEmail;
	}

	public void setCompanyEmail(String companyEmail) {
		this.companyEmail = companyEmail;
	}

	public String getCompanyAddress() {
		return companyAddress;
	}

	public void setCompanyAddress(String companyAddress) {
		this.companyAddress = companyAddress;
	}

	public String getCompanyIban() {
		return companyIban;
	}

	public void setCompanyIban(String companyIban) {
		this.companyIban = companyIban;
	}

}

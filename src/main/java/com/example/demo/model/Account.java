package com.example.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "accounts")
public class Account {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 254)
	private String email;

	@Column(unique = true, length = 20)
	private String username;

	@Column(length = 100)
	private String passwordHash;

	@Column(length = 40)
	private String phone;

	@Column(nullable = false, length = 120)
	private String name;

	@Column(name = "last_name", length = 120)
	private String lastName;

	@Column(nullable = false, length = 40)
	private String regType;

	@Column(length = 120)
	private String regOther;

	@Column(nullable = false)
	private boolean shop;

	@Column(columnDefinition = "text")
	private String avatar;

	@Column(nullable = false)
	private boolean avatarOff;

	@Column(length = 255)
	private String googleSub;

	private Long created;

	public Long getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public String getPhone() {
		return phone;
	}

	public void setPhone(String phone) {
		this.phone = phone;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getLastName() {
		return lastName;
	}

	public void setLastName(String lastName) {
		this.lastName = lastName;
	}

	public String getRegType() {
		return regType;
	}

	public void setRegType(String regType) {
		this.regType = regType;
	}

	public String getRegOther() {
		return regOther;
	}

	public void setRegOther(String regOther) {
		this.regOther = regOther;
	}

	public boolean isShop() {
		return shop;
	}

	public void setShop(boolean shop) {
		this.shop = shop;
	}

	public String getAvatar() {
		return avatar;
	}

	public void setAvatar(String avatar) {
		this.avatar = avatar;
	}

	public boolean isAvatarOff() {
		return avatarOff;
	}

	public void setAvatarOff(boolean avatarOff) {
		this.avatarOff = avatarOff;
	}

	public String getGoogleSub() {
		return googleSub;
	}

	public void setGoogleSub(String googleSub) {
		this.googleSub = googleSub;
	}

	public Long getCreated() {
		return created;
	}

	public void setCreated(Long created) {
		this.created = created;
	}

}

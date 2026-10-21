package com.example.demo.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ApiErrors {

	private static final Logger log = LoggerFactory.getLogger(ApiErrors.class);

	@ExceptionHandler(ApiException.class)
	public ResponseEntity<Map<String, Object>> api(ApiException ex) {
		return ResponseEntity.status(ex.status()).body(Map.of(
				"ok", false,
				"error", ex.code(),
				"message", ex.getMessage()));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<Map<String, Object>> unexpected(Exception ex) throws Exception {
		if (ex instanceof ErrorResponse) {
			throw ex;
		}
		log.error("request failed", ex);
		return ResponseEntity.internalServerError().body(Map.of(
				"ok", false,
				"error", "server",
				"message", "სერვერზე შეცდომა მოხდა"));
	}

}

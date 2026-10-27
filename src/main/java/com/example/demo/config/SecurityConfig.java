package com.example.demo.config;

import com.example.demo.security.AuthRateLimitFilter;
import com.example.demo.security.SecurityHeadersFilter;
import com.example.demo.security.SessionService;
import com.example.demo.security.TokenAuthFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	public UserDetailsService userDetailsService() {
		return username -> {
			throw new UsernameNotFoundException(username);
		};
	}

	@Bean
	public TokenAuthFilter tokenAuthFilter(SessionService sessions) {
		return new TokenAuthFilter(sessions);
	}

	@Bean
	public SecurityHeadersFilter securityHeadersFilter() {
		return new SecurityHeadersFilter();
	}

	@Bean
	public AuthRateLimitFilter authRateLimitFilter() {
		return new AuthRateLimitFilter();
	}

	@Bean
	public FilterRegistrationBean<TokenAuthFilter> tokenAuthFilterRegistration(TokenAuthFilter filter) {
		FilterRegistrationBean<TokenAuthFilter> registration = new FilterRegistrationBean<>(filter);
		registration.setEnabled(false);
		return registration;
	}

	@Bean
	public FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilterRegistration(SecurityHeadersFilter filter) {
		FilterRegistrationBean<SecurityHeadersFilter> registration = new FilterRegistrationBean<>(filter);
		registration.setEnabled(false);
		return registration;
	}

	@Bean
	public FilterRegistrationBean<AuthRateLimitFilter> authRateLimitFilterRegistration(AuthRateLimitFilter filter) {
		FilterRegistrationBean<AuthRateLimitFilter> registration = new FilterRegistrationBean<>(filter);
		registration.setEnabled(false);
		return registration;
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http, TokenAuthFilter tokenAuthFilter, SecurityHeadersFilter securityHeadersFilter, AuthRateLimitFilter authRateLimitFilter) throws Exception {
		http
				.csrf(AbstractHttpConfigurer::disable)
				.httpBasic(AbstractHttpConfigurer::disable)
				.formLogin(AbstractHttpConfigurer::disable)
				.anonymous(AbstractHttpConfigurer::disable)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {
					response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
					response.setContentType("application/json;charset=UTF-8");
					response.getWriter().write("{\"ok\":false,\"error\":\"unauthorized\",\"message\":\"შედით ანგარიშში\"}");
				}))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login", "/api/auth/forgot", "/api/auth/google").permitAll()
						.requestMatchers(HttpMethod.POST, "/api/payments/flitt/callback").permitAll()
						.requestMatchers(HttpMethod.GET, "/api/listings", "/api/health", "/api/payments/config").permitAll()
						.requestMatchers("/api/**").authenticated()
						.anyRequest().permitAll())
				.addFilterBefore(tokenAuthFilter, UsernamePasswordAuthenticationFilter.class)
				.addFilterBefore(authRateLimitFilter, TokenAuthFilter.class)
				.addFilterBefore(securityHeadersFilter, AuthRateLimitFilter.class);
		return http.build();
	}

}

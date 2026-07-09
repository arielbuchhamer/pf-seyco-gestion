package com.seyco.gestion.service;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.seyco.gestion.entity.Usuario;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

	private final SecretKey key;
	private final long expirationMs;

	public JwtService(
			@Value("${jwt.secret}") String secret,
			@Value("${jwt.expiration-ms}") long expirationMs) {
		this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
		this.expirationMs = expirationMs;
	}

	public String generateToken(Usuario usuario) {
		Date now = new Date();
		Date expiration = new Date(now.getTime() + expirationMs);
		return Jwts.builder()
				.subject(usuario.getEmail())
				.claim("rol", usuario.getRol().name())
				.issuedAt(now)
				.expiration(expiration)
				.signWith(key)
				.compact();
	}

	public long getExpirationMs() {
		return expirationMs;
	}

	public String extractEmail(String token) {
		return parseClaims(token).getSubject();
	}

	public String extractRol(String token) {
		return parseClaims(token).get("rol", String.class);
	}

	public boolean isTokenValid(String token) {
		try {
			parseClaims(token);
			return true;
		} catch (JwtException | IllegalArgumentException e) {
			return false;
		}
	}

	private Claims parseClaims(String token) {
		return Jwts.parser()
				.verifyWith(key)
				.build()
				.parseSignedClaims(token)
				.getPayload();
	}
}

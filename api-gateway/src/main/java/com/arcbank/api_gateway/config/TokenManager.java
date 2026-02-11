package com.arcbank.api_gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;

@Component
public class TokenManager {

    @Value("${cognito.token-url}")
    private String tokenUrl;

    @Value("${cognito.client-id}")
    private String clientId;

    @Value("${cognito.client-secret}")
    private String clientSecret;

    private String cachedToken;
    private Instant expiresAt = Instant.MIN;

    public synchronized String getToken() {
        if (Instant.now().isAfter(expiresAt.minusSeconds(60))) {
            refreshToken();
        }
        return cachedToken;
    }

    private void refreshToken() {
        RestTemplate rest = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("scope", "https://switch-api.com/transfers.write");

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = (ResponseEntity<Map<String, Object>>) (ResponseEntity<?>) rest
                    .postForEntity(
                            tokenUrl, new HttpEntity<>(body, headers), Map.class);

            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null) {
                cachedToken = (String) responseBody.get("access_token");
                Object expiresObj = responseBody.get("expires_in");
                if (expiresObj != null) {
                    int expiresIn = (expiresObj instanceof Integer) ? (Integer) expiresObj
                            : Integer.parseInt(expiresObj.toString());
                    expiresAt = Instant.now().plusSeconds(expiresIn);
                }
            }
        } catch (Exception e) {
            // Log error or handle appropriately
            System.err.println("Error refreshing token: " + e.getMessage());
        }
    }
}

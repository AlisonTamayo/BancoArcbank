package com.arcbank.api_gateway.service;

import com.arcbank.api_gateway.config.TokenManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

@Service
public class SwitchClient {

    private final WebClient webClient;
    private final TokenManager tokenManager;

    @SuppressWarnings("null")
    public SwitchClient(TokenManager tokenManager,
            @Value("${apim.base-url}") String apimBaseUrl) {
        this.tokenManager = tokenManager;
        this.webClient = WebClient.builder()
                .baseUrl(apimBaseUrl)
                .build();
    }

    @SuppressWarnings("unchecked")
    public Mono<Map<String, Object>> createTransfer(Map<String, Object> request) {
        return webClient.post()
                .uri("/api/v2/switch/transfers")
                .header("Authorization", "Bearer " + tokenManager.getToken())
                .header("Content-Type", "application/json")
                .bodyValue(request)
                .retrieve()
                .bodyToMono((Class<Map<String, Object>>) (Class<?>) Map.class);
    }

    @SuppressWarnings("unchecked")
    public Mono<Map<String, Object>> accountLookup(Map<String, Object> request) {
        return webClient.post()
                .uri("/api/v2/switch/account-lookup")
                .header("Authorization", "Bearer " + tokenManager.getToken())
                .header("Content-Type", "application/json")
                .bodyValue(request)
                .retrieve()
                .bodyToMono((Class<Map<String, Object>>) (Class<?>) Map.class);
    }

    @SuppressWarnings("unchecked")
    public Mono<Map<String, Object>> getTransferStatus(String instructionId) {
        return webClient.get()
                .uri("/api/v2/switch/transfers/{id}", instructionId)
                .header("Authorization", "Bearer " + tokenManager.getToken())
                .retrieve()
                .bodyToMono((Class<Map<String, Object>>) (Class<?>) Map.class);
    }
}

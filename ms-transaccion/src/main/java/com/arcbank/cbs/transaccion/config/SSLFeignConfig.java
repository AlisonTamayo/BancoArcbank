package com.arcbank.cbs.transaccion.config;

import feign.Client;
import lombok.extern.slf4j.Slf4j;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.client5.http.io.HttpClientConnectionManager;
import org.apache.hc.client5.http.ssl.SSLConnectionSocketFactory;
import org.apache.hc.core5.ssl.SSLContextBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import javax.net.ssl.SSLContext;
import java.io.InputStream;
import java.security.KeyStore;

/**
 * Configuración de SSL/TLS para comunicación segura con el Switch DIGICONECU
 * Implementa mTLS (Mutual TLS Authentication) usando certificados cliente
 */
@Slf4j
@Configuration
public class SSLFeignConfig {

    @Value("${app.ssl.keystore.path:classpath:certs/arcbank.p12}")
    private Resource keystoreResource;

    @Value("${app.ssl.keystore.password:changeit}")
    private String keystorePassword;

    @Value("${app.ssl.truststore.path:classpath:certs/truststore.p12}")
    private Resource truststoreResource;

    @Value("${app.ssl.truststore.password:changeit}")
    private String truststorePassword;

    @Value("${app.ssl.enabled:false}")
    private boolean sslEnabled;

    /**
     * Configuración del cliente Feign con soporte para mTLS
     */
    @Bean
    public Client feignClient() {
        if (!sslEnabled) {
            log.info("SSL deshabilitado - usando cliente HTTP por defecto");
            return new Client.Default(null, null);
        }

        try {
            log.info("Configurando cliente Feign con mTLS...");

            // Construir SSLContext con keystore (certificado cliente) y truststore
            // (certificados confiables)
            SSLContextBuilder sslContextBuilder = SSLContextBuilder.create();

            // Cargar KeyStore (certificado y llave privada del banco)
            if (keystoreResource.exists()) {
                KeyStore keyStore = KeyStore.getInstance("PKCS12");
                try (InputStream is = keystoreResource.getInputStream()) {
                    keyStore.load(is, keystorePassword.toCharArray());
                }
                sslContextBuilder.loadKeyMaterial(keyStore, keystorePassword.toCharArray());
                log.info("✓ KeyStore cargado desde: {}", keystoreResource.getDescription());
            } else {
                log.warn("⚠ KeyStore no encontrado en: {}", keystoreResource.getDescription());
            }

            // Cargar TrustStore (certificados de autoridades confiables)
            if (truststoreResource.exists()) {
                KeyStore trustStore = KeyStore.getInstance("PKCS12");
                try (InputStream is = truststoreResource.getInputStream()) {
                    trustStore.load(is, truststorePassword.toCharArray());
                }
                sslContextBuilder.loadTrustMaterial(trustStore, null);
                log.info("✓ TrustStore cargado desde: {}", truststoreResource.getDescription());
            } else {
                log.warn("⚠ TrustStore no encontrado, aceptando todos los certificados (INSEGURO en Producción)");
                sslContextBuilder.loadTrustMaterial(null, (chain, authType) -> true);
            }

            SSLContext sslContext = sslContextBuilder.build();

            // Configurar conexión HTTPS
            SSLConnectionSocketFactory sslSocketFactory = new SSLConnectionSocketFactory(sslContext);
            HttpClientConnectionManager connectionManager = PoolingHttpClientConnectionManagerBuilder.create()
                    .setSSLSocketFactory(sslSocketFactory)
                    .build();

            CloseableHttpClient httpClient = HttpClients.custom()
                    .setConnectionManager(connectionManager)
                    .build();

            log.info("✅ Cliente Feign con mTLS configurado correctamente");
            return new feign.hc5.ApacheHttp5Client(httpClient);

        } catch (Exception e) {
            log.error("❌ Error configurando SSL para Feign: {}", e.getMessage(), e);
            throw new RuntimeException("Fallo en configuración SSL", e);
        }
    }
}

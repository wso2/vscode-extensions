package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"log"
	"math/big"
	"net/http"
	"time"
)

func main() {
	mux := http.NewServeMux()

	// --- Endpoints preserved for your OpenAPI/Arazzo files ---

	mux.HandleFunc("/session", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"sessionId": "tls-test-session-123",
			"status":    "active",
		})
	})

	mux.HandleFunc("/session/tls-test-session-123/confirm", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"confirmed": true,
			"status":    "verified",
			"message":   "Session confirmed successfully",
		})
	})

	// --- General Purpose TLS Setup ---

	cert, err := generateSimpleCert()
	if err != nil {
		log.Fatalf("Failed to generate certificate: %v", err)
	}

	server := &http.Server{
		Addr:    ":9443",
		Handler: mux,
		TLSConfig: &tls.Config{
			Certificates: []tls.Certificate{cert},
			MinVersion:   tls.VersionTLS12, // Standard modern security
		},
	}

	log.Println("General Self-Signed Server starting on https://localhost:9443")
	log.Fatal(server.ListenAndServeTLS("", ""))
}

// generateSimpleCert creates a standard self-signed cert for localhost
func generateSimpleCert() (tls.Certificate, error) {
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return tls.Certificate{}, err
	}

	template := x509.Certificate{
		SerialNumber: big.NewInt(time.Now().Unix()),
		Subject: pkix.Name{
			Organization: []string{"Local Development"},
			CommonName:   "localhost",
		},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().AddDate(1, 0, 0), // Valid for 1 year
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		DNSNames:              []string{"localhost"},
	}

	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	if err != nil {
		return tls.Certificate{}, err
	}

	return tls.Certificate{
		Certificate: [][]byte{derBytes},
		PrivateKey:  priv,
	}, nil
}

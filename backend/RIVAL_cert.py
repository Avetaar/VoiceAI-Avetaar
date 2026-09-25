import ipaddress
import os
import socket
from datetime import datetime, timedelta

import RIVAL_config


def lan_ip():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return None
    finally:
        sock.close()


def ensure_certs():
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    ips = []
    for probe in (socket.gethostbyname(socket.gethostname()), lan_ip(), "127.0.0.1"):
        try:
            ip = ipaddress.ip_address(probe)
            if ip not in ips:
                ips.append(ip)
        except ValueError:
            pass

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Avetaar")])
    now = datetime.utcnow()
    builder = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(days=1))
        .not_valid_after(now + timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName(
                [x509.DNSName("Avetaar")] + [x509.IPAddress(ip) for ip in ips]
            ),
            critical=False,
        )
    )
    cert = builder.sign(key, hashes.SHA256())

    os.makedirs(RIVAL_config.CERT_DIR, exist_ok=True)
    cert_path = os.path.join(RIVAL_config.CERT_DIR, "cert.pem")
    key_path = os.path.join(RIVAL_config.CERT_DIR, "key.pem")
    with open(cert_path, "wb") as fh:
        fh.write(cert.public_bytes(serialization.Encoding.PEM))
    with open(key_path, "wb") as fh:
        fh.write(
            key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            )
        )
    return cert_path, key_path

use crate::error::{ApiResult, ApiError};
use ed25519_dalek::{PublicKey, SecretKey};
use hmac::*;
use sha2::Sha512;
use sha2::{Digest};

pub(crate) type Key192 = [u8; 24];
pub(crate) type Key256 = [u8; 32];
pub(crate) type Key264 = [u8; 33];
pub(crate) type Key512 = [u8; 64];

pub(crate) fn sha256(bytes: &[u8]) -> Vec<u8> {
    let mut hasher = sha2::Sha256::new();
    hasher.input(bytes);
    hasher.result().to_vec()
}

pub(crate) fn ton_crc16(data: &[u8]) -> u16 {
    let mut crc = crc_any::CRC::crc16xmodem();
    crc.digest(data);
    crc.get_crc() as u16
}

pub(crate) fn decode_public_key(string: &String) -> ApiResult<PublicKey> {
    PublicKey::from_bytes(parse_key(string)?.as_slice())
        .map_err(|err| ApiError::crypto_invalid_public_key(err, string))
}

pub(crate) fn decode_secret_key(string: &String) -> ApiResult<SecretKey> {
    SecretKey::from_bytes(parse_key(string)?.as_slice())
        .map_err(|err| ApiError::crypto_invalid_secret_key(err, string))
}

fn parse_key(s: &String) -> ApiResult<Vec<u8>> {
    hex::decode(s).map_err(|err| ApiError::crypto_invalid_key(err, s))
}

pub(crate) fn key512(slice: &[u8]) -> ApiResult<Key512> {
    if slice.len() != 64 {
        return Err(ApiError::crypto_invalid_key_size(slice.len(), 64));
    }
    let mut key = [0u8; 64];
    for (place, element) in key.iter_mut().zip(slice.iter()) {
        *place = *element;
    }
    Ok(key)
}

pub(crate) fn key256(slice: &[u8]) -> ApiResult<Key256> {
    if slice.len() != 32 {
        return Err(ApiError::crypto_invalid_key_size(slice.len(), 32));
    }
    let mut key = [0u8; 32];
    for (place, element) in key.iter_mut().zip(slice.iter()) {
        *place = *element;
    }
    Ok(key)
}

pub(crate) fn key192(slice: &[u8]) -> ApiResult<Key192> {
    if slice.len() != 24 {
        return Err(ApiError::crypto_invalid_key_size(slice.len(), 24));
    }
    let mut key = [0u8; 24];
    for (place, element) in key.iter_mut().zip(slice.iter()) {
        *place = *element;
    }
    Ok(key)
}


pub(crate) fn hmac_sha512(key: &[u8], data: &[u8]) -> [u8; 64] {
    let mut hmac = Hmac::<Sha512>::new_varkey(key).unwrap();
    hmac.input(&data);
    let mut result = [0u8; 64];
    result.copy_from_slice(&hmac.result().code());
    result
}

pub(crate) fn pbkdf2_hmac_sha512(password: &[u8], salt: &[u8], c: usize) -> [u8; 64] {
    let mut result = [0u8; 64];
    pbkdf2::pbkdf2::<Hmac<Sha512>>(password, salt, c, &mut result);
    result
}

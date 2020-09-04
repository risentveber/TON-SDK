/*
* Copyright 2018-2020 TON DEV SOLUTIONS LTD.
*
* Licensed under the SOFTWARE EVALUATION License (the "License"); you may not use
* this file except in compliance with the License.
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific TON DEV software governing permissions and
* limitations under the License.
*/

use sha2::{Digest};
use crate::client::ClientContext;
use crate::error::{ApiResult};
use crate::encoding::base64_decode;

//--------------------------------------------------------------------------------------------- sha

#[derive(Serialize, Deserialize, TypeInfo)]
pub struct ParamsOfHash {
    /// Input data for hash calculation. Encoded with `base64`.
    pub data: String,
}

#[derive(Serialize, Deserialize, TypeInfo)]
pub struct ResultOfHash {
    /// Hex-encoded hash of input `data`.
    pub hash: String,
}

#[doc(summary = "Calculates SHA256 hash of the specified data.")]
pub fn sha256(
    _context: &mut ClientContext,
    params: ParamsOfHash,
) -> ApiResult<ResultOfHash> {
    let mut hasher = sha2::Sha256::new();
    hasher.input(base64_decode(&params.data)?);
    Ok(ResultOfHash {
        hash: hex::encode(hasher.result().to_vec())
    })
}


#[doc(summary = "Calculates SHA512 hash of the specified data.")]
pub fn sha512(
    _context: &mut ClientContext,
    params: ParamsOfHash,
) -> ApiResult<ResultOfHash> {
    let mut hasher = sha2::Sha512::new();
    hasher.input(base64_decode(&params.data)?);
    Ok(ResultOfHash {
        hash: hex::encode(hasher.result().to_vec())
    })
}


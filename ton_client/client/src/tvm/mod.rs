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
 *
 */

mod check_transaction;
mod errors;
pub(crate) mod execute_get;
pub(crate) mod execute_message;
mod types;

mod stack;
#[cfg(test)]
mod tests;

pub use errors::{Error, ErrorCode};
pub use execute_get::{execute_get, ParamsOfExecuteGet, ResultOfExecuteGet};
pub use execute_message::{
    execute_message, ExecutionMode, ExecutionOptions, ParamsOfExecuteMessage,
    ResultOfExecuteMessage,
};
pub use types::ExitCode;

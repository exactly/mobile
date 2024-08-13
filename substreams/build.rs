use anyhow::{Error, Ok, Result};
use std::process::Command;

fn main() -> Result<(), Error> {
  Command::new("substreams").arg("protogen").status().expect("substreams protogen failed");

  Ok(())
}

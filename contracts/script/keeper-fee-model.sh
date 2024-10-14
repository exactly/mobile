#!/usr/bin/env bash

read -ra input <<< "$(cast abi-decode "_()(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)" "$1" | sed 's/ .*//' | xargs)"

fee=$(BC_LINE_LENGTH=666 bc -l <<< "
  scale     = 2 * 18

  wad         = 1000000000000000000
  dstart      = ${input[0]} / wad
  dend        = ${input[1]} / wad
  dgrowth     = ${input[2]} / wad
  feestart    = ${input[3]} / wad
  feeend      = ${input[4]} / wad
  minfee      = ${input[5]} / wad
  linearr     = ${input[6]} / wad
  amountstime = ${input[7]} / wad
  total       = ${input[8]} / wad

  avgduration = amountstime / total
  linearfee = minfee + (feeend - feestart) * (avgduration - dstart) / (dend - dstart)

  nonlinearfee = feestart + (feeend - feestart) * e(dgrowth * l((avgduration - dstart) / (dend - dstart)))
  fee = minfee + linearfee * linearr + nonlinearfee * (1 - linearr)

  scale     = 0
  print fee * wad / 1
")

cast --to-uint256 -- "$fee" | tr -d '\n'

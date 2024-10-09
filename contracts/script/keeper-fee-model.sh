#!/usr/bin/env bash

read -ra input <<< "$(cast abi-decode "_()(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)" "$1" | sed 's/ .*//' | xargs)"

fee=$(BC_LINE_LENGTH=666 bc -l <<< "
  scale     = 2 * 18

  wad         = 1000000000000000000
  dend        = ${input[0]} / wad
  dgrowth     = ${input[1]} / wad
  dstart      = ${input[2]} / wad
  feeend      = ${input[3]} / wad
  feestart    = ${input[4]} / wad
  linearp     = ${input[5]} / wad
  minfee      = ${input[6]} / wad
  amountstime = ${input[7]} / wad
  total       = ${input[8]} / wad

  avgduration = amountstime / total
  linearfee = minfee + (feeend - feestart) * (avgduration - dstart) / (dend - dstart)

  nonlinearfee = feestart + (feeend - feestart) * e(dgrowth * l((avgduration - dstart) / (dend - dstart)))
  fee = minfee + linearfee * linearp + nonlinearfee * (1 - linearp)

  scale     = 0
  print fee * wad / 1
")

cast --to-uint256 -- "$fee" | tr -d '\n'

let sample = {
  assertion: 0,
  integer: 1,
  "linked comprehension": 2,
  "linked comprehension multiple choice": 0,
  matrix: 1,
  "matrix single choice": 0,
  "multiple choice": 2,
  "single choice": 2,
  "subjective numerical": 0,
  "true-false": 0
};

let total = 36;

// console.log(sample);
function rationDiff(updatedAlotment, sample, balance, item) {
  console.log(
    "rationDiff",
    updatedAlotment,
    sample,
    balance,
    item,
    balance <= 0
  );
  const update = updatedAlotment + sample;
  if (sample > balance) {
    console.log("rationDiff", updatedAlotment + balance);
    return updatedAlotment + balance;
  } else {
    return updatedAlotment + sample;
  }
}

function ratiocalculate(sample, total) {
  let notnegative = true;
  let negativeChecked = false;
  function rationBal(balance, alot, samplealot, item) {
    updatedBal = balance - samplealot;
    console.log(
      "rationBal",
      { updatedBal },
      { balance },
      { alot },
      { samplealot },
      { item }
    );

    // console.log("rationBal", updatedBal < 0);
    if (updatedBal <= 0) {
      console.log(updatedBal, balance - (samplealot % 1));
      return { updatedBal: alot - (balance - (samplealot % 1)), break: true };
    } else {
      return { updatedBal, break: false };
    }
    // return {
    //   updatedBal
    // };
  }

  let length = Object.keys(sample).length;
  let keys = Object.keys(sample);
  let balanceTotal = total;
  let updatedSample = {};
  // let totalbalance = total;
  // console.log("before balanceTotal", balanceTotal);
  i = 0;
  do {
    // console.log(i, balanceTotal, notnegative);
    // updatedSample[keys[i]] = updatedSample[keys[i]] > 0;
    // if (notnegative) {
    negativeChecked = true;
    let updated;
    // console.log({ balanceTotal });

    for (j = 0; j <= length - 1; j++) {
      updatedSample[keys[j]] =
        updatedSample[keys[j]] > 0
          ? rationDiff(
              updatedSample[keys[j]],
              sample[keys[j]],
              balanceTotal,
              keys[j]
            )
          : sample[keys[j]];

      updated = rationBal(
        balanceTotal,
        updatedSample[keys[j]],
        sample[keys[j]],
        keys[j]
      );
      balanceTotal = updated.updatedBal;
      console.log("balanceTotal", updated);

      if (balanceTotal <= 0 || updated.break) {
        // console.log("asdasd", rationBal(balanceTotal, updatedSample[keys[j]]));
        break;
      }
    }
    if (updated.break) {
      break;
    }

    // }
    i++;
  } while (i <= balanceTotal);
  // for (i = 0; i <= balanceTotal; i++) {}
  console.log(updatedSample, balanceTotal);
  return {
    balance: balanceTotal,
    sample
  };
}

ratiocalculate(sample, total);

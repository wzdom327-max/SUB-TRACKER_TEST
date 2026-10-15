// 구독 객체(subscription)의 데이터 모양 예시입니다.
// 각 객체를 배열에 담아 여러 개의 구독을 관리합니다.
//{
//  "id": "sub_1",
//  "name": "넷플릭스",
//  "amount": 13500,
//  "cycle": "monthly", //"monthly" 또는 "yearly"//  
//  "nextPaymentDate": "2024-06-15"
//  "category": "영상",
//  "paymentmethod": "신한카드"
//}


// 구독 객체 하나를 받아 월 기준 금액을 계산합니다.
// 예를 들어 연간 120,000원 구독은 월 10,000원으로 환산합니다.
// 연간 금액을 12로 나눈 결과에 소수점이 생기면 Math.round로 가장 가까운 원 단위로 반올림합니다.
function getMonthlyAmount(subscription) {
    // cycle 값이 yearly일 때에만 연간 금액을 12개월로 나눕니다.
    if (subscription.cycle === "yearly") {
        return Math.round(subscription.amount / 12);
    }
    // 월간 구독은 이미 월 금액이므로 그대로 반환합니다.
    return subscription.amount;
}
// 구독 객체 배열의 각 항목을 월 금액으로 환산해 모두 더한 총액을 반환합니다.
function getTotalMonthlyAmount(subscriptions) {
    // 합계를 0부터 시작합니다. 구독이 없으면 결과도 0입니다.
    let total = 0;
    // 배열에 들어 있는 구독을 하나씩 방문해 월 금액을 합산합니다.
    for (const subscription of subscriptions) {
        total += getMonthlyAmount(subscription);
    }
    return total;
}
// 배열 안의 모든 구독에 대한 연간 예상 지출을 반환합니다.
// 이 앱에서는 월 환산 합계가 12개월 유지된다고 보고 월 합계에 12를 곱합니다.
function getTotalAnnualAmount(subscriptions) {
    return getTotalMonthlyAmount(subscriptions) * 12;
}
// 오늘 날짜와 다음 결제일 사이의 날짜 차이를 일수로 계산합니다.
// 두 인자는 "YYYY-MM-DD" 형식 문자열입니다.
// Date 빼기는 밀리초 차이를 반환하므로 하루의 밀리초 수로 나눕니다.
// 오늘 결제일이면 0, 미래면 양수, 이미 지난 날짜면 음수가 됩니다.
function getDaysUntilPayment(today, nextPaymentDate) {
    const todayDate = new Date(today);
    const paymentDate = new Date(nextPaymentDate);
    // 두 날짜의 밀리초 차이입니다. Date 객체는 숫자 연산에서 timestamp로 변환됩니다.
    const diffTime = paymentDate - todayDate;
    // 하루 미만 차이도 날짜 단위로 계산할 수 있도록 올림합니다.
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
// 오늘부터 n일 이내에 결제일이 오는 구독만 새 배열로 반환합니다.
// 이미 결제일이 지난 구독은 남은 일수가 음수이므로 제외됩니다.
function getUpcomingPayments(subscriptions, n) {
    // 결과를 모아 반환할 빈 배열입니다.
    const upcoming = [];
    // 각 구독마다 오늘 날짜와 결제일 사이의 남은 날짜를 계산합니다.
    for (const subscription of subscriptions) {
        const daysUntilPayment = getDaysUntilPayment(new Date().toISOString().split('T')[0], subscription.nextPaymentDate);
        // 오늘(0일)부터 지정한 n일까지 범위에 들어오는 항목만 포함합니다.
        if (daysUntilPayment >= 0 && daysUntilPayment <= n) {
            upcoming.push(subscription);
        }
    }
    return upcoming;
}
// 구독을 category 값으로 묶어 각 카테고리의 월 기준 합계를 객체로 반환합니다.
// 예: { "영상": 13500, "음악": 10900 }
function getMonthlyAmountByCategory(subscriptions) {
    // 반환 객체의 키는 카테고리, 값은 그 카테고리에 속한 월 금액 합계입니다.
    const categoryTotals = {};
    // 각 구독의 월 환산 금액을 해당 카테고리의 누적 합계에 더합니다.
    for (const subscription of subscriptions) {
        const category = subscription.category;
        const monthlyAmount = getMonthlyAmount(subscription);
        // 해당 카테고리에 이미 합계가 있으면 더하고, 처음 나오면 새 합계를 만듭니다.
        if (categoryTotals[category]) {
            categoryTotals[category] += monthlyAmount;
        } else {
            categoryTotals[category] = monthlyAmount;
        }
    }
    return categoryTotals;
}

// 구독을 paymentmethod(결제 수단) 값으로 묶어 월 금액 합계를 반환합니다.
// 예: { "신한카드": 58500, "KB카드": 20900 }
function getMonthlyAmountByPaymentMethod(subscriptions) {
    // 반환 객체의 키는 결제 수단이고 값은 해당 수단으로 결제하는 월 금액의 합계입니다.
    const paymentMethodTotals = {};                                 
    // 구독별 월 금액을 결제 수단에 대응되는 합계에 추가합니다.
    for (const subscription of subscriptions) {
        const paymentMethod = subscription.paymentmethod;
        const monthlyAmount = getMonthlyAmount(subscription);   
        // 같은 결제 수단이 앞에서 등장했으면 금액을 누적하고, 아니면 새 항목을 만듭니다.
        if (paymentMethodTotals[paymentMethod]) {
            paymentMethodTotals[paymentMethod] += monthlyAmount;
        } else {
            paymentMethodTotals[paymentMethod] = monthlyAmount;
        }       
    }
    return paymentMethodTotals;
}     



// 금액을 한국어 로케일 표기(예: 12,000)로 바꿔주는 포매터입니다.
// 매번 Intl.NumberFormat을 새로 만들지 않고 화면 전체에서 재사용합니다.
const currencyFormatter = new Intl.NumberFormat("ko-KR");

// 숫자 금액을 화면에 보여줄 원화 문자열로 바꿉니다.
function formatWon(amount) {
    return `${currencyFormatter.format(amount)}원`;
}

// HTML 요소를 만들고 클래스와 화면 텍스트를 설정하는 공통 도우미입니다.
// textContent를 사용하므로 사용자 입력이 HTML로 해석되지 않습니다.
function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

// 결제일까지 남은 일수를 D-day 표기로 바꿉니다.
// 미래는 D-숫자, 오늘은 D-day, 지난 날짜는 D+숫자로 표시합니다.
function getDaysLabel(days) {
    if (days < 0) return `D+${Math.abs(days)}`;
    if (days === 0) return "D-day";
    return `D-${days}`;
}

// 전달받은 구독 배열을 카드 목록으로 그립니다.
// today는 YYYY-MM-DD 문자열이며 각 카드의 남은 날짜를 계산할 때 사용합니다.
function renderSubscriptionList(subscriptions, today) {
    // 이전에 그려둔 DOM을 비운 뒤 최신 데이터로 다시 만듭니다.
    const list = document.querySelector("#subscription-list");
    list.replaceChildren();
    // 목록 개수 표시도 배열의 실제 길이에 맞춥니다.
    document.querySelector("#subscription-count").textContent = `${subscriptions.length}개`;

    // 구독이 하나도 없을 때는 빈 상태 안내를 보여주고 카드 생성을 끝냅니다.
    if (subscriptions.length === 0) {
        list.append(createElement("p", "empty-state", "등록된 구독이 없어요.\n오른쪽 폼에서 첫 구독을 추가해보세요."));
        return;
    }

    // 배열의 각 구독 데이터로 카드 하나를 만들고 목록에 추가합니다.
    subscriptions.forEach((subscription) => {
        // 카드의 왼쪽에는 이름과 부가 정보, 오른쪽에는 월 금액과 D-day가 들어갑니다.
        const card = createElement("article", "subscription-card");
        const details = createElement("div");
        const name = createElement("p", "subscription-name", subscription.name);
        const meta = createElement("div", "subscription-meta");
        meta.append(
            createElement("span", "", subscription.category),
            createElement("span", "", subscription.cycle === "yearly" ? "연간 결제" : "월간 결제")
        );
        // 결제 수단은 선택 항목이므로 값이 있는 경우에만 표시합니다.
        if (subscription.paymentmethod) {
            meta.append(createElement("span", "", subscription.paymentmethod));
        }
        details.append(name, meta);

        const payment = createElement("div");
        payment.append(
            // 연간 결제 항목도 비교하기 쉽도록 logic.js의 함수로 월 금액으로 환산합니다.
            createElement("p", "subscription-cost", `${formatWon(getMonthlyAmount(subscription))}/월`),
            createElement("div", "payment-day", getDaysLabel(getDaysUntilPayment(today, subscription.nextPaymentDate)))
        );

        // 두 버튼은 data-action과 data-id를 통해 main.js의 이벤트 처리기에 전달됩니다.
        const actions = createElement("div", "card-actions");
        const editButton = createElement("button", "text-button", "수정");
        editButton.type = "button";
        editButton.dataset.action = "edit";
        editButton.dataset.id = String(subscription.id);
        editButton.setAttribute("aria-label", `${subscription.name} 수정`);

        const deleteButton = createElement("button", "text-button text-button-danger", "삭제");
        deleteButton.type = "button";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.id = String(subscription.id);
        deleteButton.setAttribute("aria-label", `${subscription.name} 삭제`);
        actions.append(editButton, deleteButton);
        card.append(details, payment, actions);
        list.append(card);
    });
}

// 월 기준 금액을 카테고리별로 합산한 뒤, 금액과 전체 비중 막대를 표시합니다.
function renderCategories(subscriptions) {
    const container = document.querySelector("#category-list");
    container.replaceChildren();
    // 계산은 logic.js의 기존 함수를 재사용하여 화면별 계산 규칙이 달라지지 않게 합니다.
    const totals = getMonthlyAmountByCategory(subscriptions);
    const total = getTotalMonthlyAmount(subscriptions);
    // 가장 많이 지출하는 카테고리가 먼저 보이도록 금액 내림차순으로 정렬합니다.
    const categories = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    // 데이터가 없으면 막대 대신 안내 문구를 표시합니다.
    if (categories.length === 0) {
        container.append(createElement("p", "empty-state", "구독을 추가하면 카테고리별 지출 비중을 보여드려요."));
        return;
    }

    // 각 카테고리마다 이름/금액 행과 접근성 정보가 있는 진행 막대를 만듭니다.
    categories.forEach(([category, amount]) => {
        const item = createElement("div", "category-item");
        const labelRow = createElement("div", "category-label-row");
        // 비중 숫자는 정수 백분율로 표시합니다. 실제 막대 너비는 소수 비율을 사용합니다.
        labelRow.append(
            createElement("span", "category-name", category),
            createElement("span", "category-amount", `${formatWon(amount)} · ${Math.round((amount / total) * 100)}%`)
        );
        const track = createElement("div", "progress-track");
        // 진행 막대의 의미와 현재 값을 스크린 리더가 읽을 수 있도록 ARIA 속성을 지정합니다.
        track.setAttribute("role", "progressbar");
        track.setAttribute("aria-label", `${category} 지출 비중`);
        track.setAttribute("aria-valuemin", "0");
        track.setAttribute("aria-valuemax", "100");
        track.setAttribute("aria-valuenow", String(Math.round((amount / total) * 100)));
        const fill = createElement("div", "progress-fill");
        // 백분율만큼 채우되 최대 너비가 100%를 넘지 않게 제한합니다.
        fill.style.width = `${Math.min(100, (amount / total) * 100)}%`;
        track.append(fill);
        item.append(labelRow, track);
        container.append(item);
    });
}

// 요약 숫자와 목록, 카테고리 분석을 현재 데이터 기준으로 한 번에 다시 그립니다.
function renderApp(subscriptions) {
    // 날짜 함수가 기대하는 날짜 부분만 뽑아 오늘 날짜를 만듭니다.
    const today = new Date().toISOString().slice(0, 10);
    // 7일 이내 결제 예정 구독을 logic.js 함수로 조회합니다.
    const upcomingPayments = getUpcomingPayments(subscriptions, 7);
    // 구독 계산 함수에서 얻은 합계를 요약 카드에 원화 형식으로 표시합니다.
    document.querySelector("#monthly-total").textContent = formatWon(getTotalMonthlyAmount(subscriptions));
    document.querySelector("#annual-total").textContent = formatWon(getTotalAnnualAmount(subscriptions));
    document.querySelector("#upcoming-count").textContent = `${upcomingPayments.length}건`;
    // 결제 예정이 있으면 서비스 이름들을 표시하고, 없으면 기간 안내를 표시합니다.
    document.querySelector("#upcoming-note").textContent = upcomingPayments.length
        ? upcomingPayments.map((subscription) => subscription.name).join(", ")
        : "앞으로 7일 이내";
    // 세부 목록과 카테고리 분석도 같은 데이터로 갱신합니다.
    renderSubscriptionList(subscriptions, today);
    renderCategories(subscriptions);
}

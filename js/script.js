/* =========================================================
   DataLens
   JavaScript - GitHub Pages Version
   HTML + CSS + JavaScript
   ========================================================= */

(() => {

    const STORAGE_KEY = "datalens_dataset_v1";

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        [...root.querySelectorAll(selector)];


    /* =====================================================
       Local Storage
       ===================================================== */

    function getStoredData() {
        try {
            return JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "null"
            );
        } catch (error) {
            return null;
        }
    }


    function saveData(rows, fileName) {

        const dataset = {
            name: fileName,
            rows: rows,
            savedAt: new Date().toISOString()
        };

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(dataset)
        );
    }


    /* =====================================================
       CSV Reader
       ===================================================== */

    function splitCSVLine(line) {

        const result = [];

        let value = "";
        let quoted = false;

        for (let i = 0; i < line.length; i++) {

            const character = line[i];

            if (character === '"') {

                if (
                    quoted &&
                    line[i + 1] === '"'
                ) {

                    value += '"';
                    i++;

                } else {

                    quoted = !quoted;

                }

            } else if (
                character === "," &&
                !quoted
            ) {

                result.push(value.trim());
                value = "";

            } else {

                value += character;

            }
        }

        result.push(value.trim());

        return result;
    }


    function parseCSV(text) {

        const lines = text
            .replace(/^\uFEFF/, "")
            .split(/\r?\n/)
            .filter(line => line.trim());


        if (lines.length < 2) {

            throw new Error(
                "ملف CSV لا يحتوي على بيانات كافية."
            );

        }


        const headers =
            splitCSVLine(lines[0]);


        return lines
            .slice(1)
            .map(line => {

                const values =
                    splitCSVLine(line);

                const row = {};

                headers.forEach(
                    (header, index) => {

                        row[header] =
                            values[index] ?? "";

                    }
                );

                return row;

            });

    }


    /* =====================================================
       JSON Reader
       ===================================================== */

    function parseDataset(file, text) {

        const fileName =
            file.name.toLowerCase();


        if (fileName.endsWith(".json")) {

            const data =
                JSON.parse(text);


            if (!Array.isArray(data)) {

                throw new Error(
                    "ملف JSON يجب أن يحتوي على مصفوفة من السجلات."
                );

            }

            return data;
        }


        if (fileName.endsWith(".csv")) {

            return parseCSV(text);

        }


        throw new Error(
            "نوع الملف غير مدعوم حالياً. استخدم CSV أو JSON."
        );
    }


    /* =====================================================
       Dataset Utilities
       ===================================================== */

    function getColumns(rows) {

        if (!rows.length) {
            return [];
        }

        return Object.keys(rows[0]);
    }


    function getNumericValues(rows, column) {

        return rows
            .map(row => Number(row[column]))
            .filter(value =>
                Number.isFinite(value)
            );

    }


    function calculateMean(values) {

        if (!values.length) {
            return 0;
        }

        return (
            values.reduce(
                (sum, value) =>
                    sum + value,
                0
            ) / values.length
        );

    }


    function calculateMedian(values) {

        if (!values.length) {
            return 0;
        }


        const sorted =
            [...values].sort(
                (a, b) => a - b
            );


        const middle =
            Math.floor(
                sorted.length / 2
            );


        if (sorted.length % 2) {

            return sorted[middle];

        }


        return (
            sorted[middle - 1] +
            sorted[middle]
        ) / 2;

    }


    function calculateStandardDeviation(values) {

        if (values.length < 2) {
            return 0;
        }


        const mean =
            calculateMean(values);


        const variance =
            values.reduce(
                (sum, value) =>
                    sum +
                    Math.pow(
                        value - mean,
                        2
                    ),
                0
            ) /
            (values.length - 1);


        return Math.sqrt(variance);

    }


    /* =====================================================
       Correlation
       ===================================================== */

    function calculateCorrelation(x, y) {

        const length =
            Math.min(
                x.length,
                y.length
            );


        if (length < 2) {
            return 0;
        }


        x = x.slice(0, length);
        y = y.slice(0, length);


        const meanX =
            calculateMean(x);

        const meanY =
            calculateMean(y);


        let numerator = 0;
        let denominatorX = 0;
        let denominatorY = 0;


        for (
            let i = 0;
            i < length;
            i++
        ) {

            const differenceX =
                x[i] - meanX;

            const differenceY =
                y[i] - meanY;


            numerator +=
                differenceX *
                differenceY;


            denominatorX +=
                differenceX *
                differenceX;


            denominatorY +=
                differenceY *
                differenceY;
        }


        if (
            denominatorX === 0 ||
            denominatorY === 0
        ) {

            return 0;

        }


        return (
            numerator /
            Math.sqrt(
                denominatorX *
                denominatorY
            )
        );

    }


    /* =====================================================
       File Upload
       ===================================================== */

    function setupFileUpload() {

        const fileInputs =
            $$('input[type="file"]');


        fileInputs.forEach(input => {

            input.addEventListener(
                "change",
                function () {

                    const file =
                        input.files[0];


                    if (!file) {
                        return;
                    }


                    const reader =
                        new FileReader();


                    reader.onload =
                        function () {

                            try {

                                const rows =
                                    parseDataset(
                                        file,
                                        String(
                                            reader.result
                                        )
                                    );


                                saveData(
                                    rows,
                                    file.name
                                );


                                alert(
                                    "تم تحميل " +
                                    rows.length +
                                    " سجل بنجاح."
                                );


                                location.reload();


                            } catch (error) {

                                alert(
                                    "تعذر قراءة الملف: " +
                                    error.message
                                );

                            }

                        };


                    reader.readAsText(file);

                }
            );

        });

    }


    /* =====================================================
       Overview Page
       ===================================================== */

    function renderOverview(rows) {

        const cards =
            $$(".grid .card h2");


        if (!cards.length) {
            return;
        }


        const columns =
            getColumns(rows);


        let missingValues = 0;


        rows.forEach(row => {

            columns.forEach(column => {

                if (
                    row[column] === "" ||
                    row[column] === null ||
                    row[column] === undefined
                ) {

                    missingValues++;

                }

            });

        });


        const totalValues =
            rows.length *
            columns.length;


        let quality = 100;


        if (totalValues > 0) {

            quality =
                Math.round(
                    (
                        1 -
                        missingValues /
                        totalValues
                    ) * 100
                );

        }


        if (cards[0]) {

            cards[0].textContent =
                rows.length;

        }


        if (cards[1]) {

            cards[1].textContent =
                columns.length;

        }


        if (cards[2]) {

            cards[2].textContent =
                quality + "%";

        }

    }


    /* =====================================================
       Profile Page
       ===================================================== */

    function renderProfile(rows) {

        const tbody =
            $("tbody");


        if (!tbody) {
            return;
        }


        const columns =
            getColumns(rows);


        tbody.innerHTML =
            columns.map(column => {

                const values =
                    rows.map(
                        row =>
                            row[column]
                    );


                const missing =
                    values.filter(
                        value =>
                            value === "" ||
                            value === null ||
                            value === undefined
                    ).length;


                const numericValues =
                    getNumericValues(
                        rows,
                        column
                    );


                let type = "نصي";


                if (
                    numericValues.length >=
                    Math.max(
                        1,
                        values.length * 0.7
                    )
                ) {

                    type = "رقمي";

                }


                const uniqueValues =
                    new Set(values).size;


                const status =
                    missing > 0
                        ? "يحتاج مراجعة"
                        : "جيد";


                return `

                    <tr>

                        <td>${column}</td>

                        <td>${type}</td>

                        <td>${missing}</td>

                        <td>${uniqueValues}</td>

                        <td>${status}</td>

                    </tr>

                `;

            }).join("");

    }


    /* =====================================================
       Quality Page
       ===================================================== */

    function renderQuality(rows) {

        const columns =
            getColumns(rows);


        let missingValues = 0;


        rows.forEach(row => {

            columns.forEach(column => {

                if (
                    row[column] === "" ||
                    row[column] === null ||
                    row[column] === undefined
                ) {

                    missingValues++;

                }

            });

        });


        const rowStrings =
            rows.map(
                row =>
                    JSON.stringify(row)
            );


        const uniqueRows =
            new Set(rowStrings);


        const duplicates =
            rows.length -
            uniqueRows.size;


        const totalValues =
            rows.length *
            columns.length;


        let qualityScore = 100;


        if (totalValues > 0) {

            qualityScore -=
                (
                    missingValues /
                    totalValues
                ) * 70;

        }


        if (rows.length > 0) {

            qualityScore -=
                (
                    duplicates /
                    rows.length
                ) * 30;

        }


        qualityScore =
            Math.max(
                0,
                Math.round(
                    qualityScore
                )
            );


        const cards =
            $$(".card");


        if (cards[0]) {

            cards[0].innerHTML = `

                <h2>
                    درجة الجودة
                </h2>

                <h1>
                    ${qualityScore}%
                </h1>

            `;

        }


        if (cards[1]) {

            cards[1].innerHTML = `

                <h2>
                    مشكلات البيانات
                </h2>

                <p>
                    القيم المفقودة:
                    ${missingValues}
                </p>

                <p>
                    الصفوف المكررة:
                    ${duplicates}
                </p>

            `;

        }

    }


    /* =====================================================
       Statistics Page
       ===================================================== */

    function renderStatistics(rows) {

        const select =
            $("select");


        if (!select) {
            return;
        }


        const numericColumns =
            getColumns(rows)
                .filter(column =>
                    getNumericValues(
                        rows,
                        column
                    ).length > 0
                );


        select.innerHTML = `

            <option value="">
                اختر عموداً
            </option>

        `;


        numericColumns.forEach(column => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                column;


            option.textContent =
                column;


            select.appendChild(
                option
            );

        });


        select.addEventListener(
            "change",
            function () {

                const column =
                    select.value;


                if (!column) {
                    return;
                }


                const values =
                    getNumericValues(
                        rows,
                        column
                    );


                if (!values.length) {
                    return;
                }


                const output =
                    select
                        .closest(".card")
                        ?.querySelector(
                            ".muted"
                        );


                if (!output) {
                    return;
                }


                const count =
                    values.length;


                const mean =
                    calculateMean(
                        values
                    );


                const median =
                    calculateMedian(
                        values
                    );


                const standardDeviation =
                    calculateStandardDeviation(
                        values
                    );


                const minimum =
                    Math.min(
                        ...values
                    );


                const maximum =
                    Math.max(
                        ...values
                    );


                output.innerHTML = `

                    <strong>
                        نتائج ${column}
                    </strong>

                    <br><br>

                    العدد:
                    ${count}

                    <br>

                    المتوسط:
                    ${mean.toFixed(2)}

                    <br>

                    الوسيط:
                    ${median.toFixed(2)}

                    <br>

                    الانحراف المعياري:
                    ${standardDeviation.toFixed(2)}

                    <br>

                    أدنى قيمة:
                    ${minimum}

                    <br>

                    أعلى قيمة:
                    ${maximum}

                `;

            }
        );

    }


    /* =====================================================
       Correlation Page
       ===================================================== */

    function renderCorrelation(rows) {

        const container =
            $(".static-placeholder");


        if (!container) {
            return;
        }


        const numericColumns =
            getColumns(rows)
                .filter(column =>
                    getNumericValues(
                        rows,
                        column
                    ).length > 1
                );


        if (
            numericColumns.length < 2
        ) {

            container.innerHTML = `

                <p class="muted">

                    نحتاج إلى متغيرين رقميين
                    على الأقل لحساب الارتباط.

                </p>

            `;

            return;
        }


        let table = `

            <div class="table-wrap">

            <table>

                <thead>

                    <tr>

                        <th>
                            المتغير
                        </th>

        `;


        numericColumns.forEach(column => {

            table +=
                `<th>${column}</th>`;

        });


        table += `

                    </tr>

                </thead>

                <tbody>

        `;


        numericColumns.forEach(
            columnA => {

                table += `

                    <tr>

                        <th>
                            ${columnA}
                        </th>

                `;


                numericColumns.forEach(
                    columnB => {

                        const x =
                            getNumericValues(
                                rows,
                                columnA
                            );


                        const y =
                            getNumericValues(
                                rows,
                                columnB
                            );


                        const value =
                            calculateCorrelation(
                                x,
                                y
                            );


                        table += `

                            <td>

                                ${value.toFixed(3)}

                            </td>

                        `;

                    }
                );


                table +=
                    "</tr>";

            }
        );


        table += `

                </tbody>

            </table>

            </div>

        `;


        container.innerHTML =
            table;

    }


    /* =====================================================
       Dataset Library
       ===================================================== */

    function renderDatasetLibrary(
        storedData
    ) {

        const tbody =
            $("tbody");


        if (!tbody) {
            return;
        }


        const fileName =
            storedData.name ||
            "dataset";


        const extension =
            fileName.includes(".")
                ? fileName
                    .split(".")
                    .pop()
                    .toUpperCase()
                : "DATA";


        const date =
            storedData.savedAt
                ? new Date(
                    storedData.savedAt
                ).toLocaleString("ar")
                : "-";


        tbody.innerHTML = `

            <tr>

                <td>
                    ${fileName}
                </td>

                <td>
                    ${extension}
                </td>

                <td>
                    ${date}
                </td>

                <td>

                    <button
                        type="button"
                        class="ghost"
                        id="deleteDataset"
                    >

                        حذف

                    </button>

                </td>

            </tr>

        `;


        const deleteButton =
            $("#deleteDataset");


        if (deleteButton) {

            deleteButton.addEventListener(
                "click",
                function () {

                    const confirmation =
                        confirm(
                            "هل تريد حذف مجموعة البيانات المحفوظة؟"
                        );


                    if (!confirmation) {
                        return;
                    }


                    localStorage.removeItem(
                        STORAGE_KEY
                    );


                    location.reload();

                }
            );

        }

    }


    /* =====================================================
       Page Detection
       ===================================================== */

    function renderCurrentPage() {

        const storedData =
            getStoredData();


        if (
            !storedData ||
            !Array.isArray(
                storedData.rows
            )
        ) {

            return;
        }


        const rows =
            storedData.rows;


        const page =
            location.pathname
                .split("/")
                .pop();


        switch (page) {

            case "overview.html":

                renderOverview(rows);

                break;


            case "profile.html":

                renderProfile(rows);

                break;


            case "quality.html":

                renderQuality(rows);

                break;


            case "statistics.html":

                renderStatistics(rows);

                break;


            case "correlation.html":

                renderCorrelation(rows);

                break;


            case "datasets.html":

                renderDatasetLibrary(
                    storedData
                );

                break;

        }

    }


    /* =====================================================
       Login - GitHub Demo
       ===================================================== */

    function setupDemoLogin() {

        const page =
            location.pathname
                .split("/")
                .pop();


        if (
            page !== "login.html"
        ) {

            return;
        }


        const loginButton =
            $(".auth-form-panel .primary");


        if (!loginButton) {
            return;
        }


        loginButton.addEventListener(
            "click",
            function () {

                /*
                 * هذا تسجيل دخول تجريبي فقط.
                 * تسجيل الدخول الحقيقي سيتم
                 * باستخدام PHP + MySQL
                 * على InfinityFree.
                 */

                location.href =
                    "overview.html";

            }
        );

    }


    /* =====================================================
       Forms that need PHP
       ===================================================== */

    function setupServerForms() {

        const page =
            location.pathname
                .split("/")
                .pop();


        if (
            page === "contact.html"
        ) {

            const form =
                $("form");


            if (form) {

                form.addEventListener(
                    "submit",
                    function (event) {

                        event.preventDefault();


                        alert(
                            "نموذج التواصل جاهز من ناحية الواجهة. سيتم ربطه بقاعدة البيانات عند الانتقال إلى PHP و MySQL على InfinityFree."
                        );

                    }
                );

            }

        }

    }


    /* =====================================================
       Start DataLens
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            setupFileUpload();

            renderCurrentPage();

            setupDemoLogin();

            setupServerForms();

        }
    );

})();

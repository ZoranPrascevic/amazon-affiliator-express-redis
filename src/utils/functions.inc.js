exports.getNote = (score, anzTests) => {
    score = parseInt(score);

    if (score >= 90) {
        return "sehr gut";
    }
    if (score >= 75) {
        return "gut";
    }
    if (score >= 60) {
        return "befried.";
    }
    if (score >= 40) {
        return "ausreich.";
    }
    if (score >= 1) {
        return "mangelhaft";
    }
    if (anzTests) {
        return "keine Note";
    }

    return "keine Tests";
};

exports.formatDate = (date) => {
    var d = new Date(date),
        month = "" + (d.getMonth() + 1),
        day = "" + d.getDate(),
        year = d.getFullYear(),
        hour = "" + d.getHours(),
        minute = "" + d.getMinutes(),
        second = "" + d.getSeconds();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    if (hour.length < 2) hour = "0" + hour;
    if (minute.length < 2) minute = "0" + minute;
    if (second.length < 2) second = "0" + second;

    return [year, month, day].join("-") + " " + [hour, minute, second].join(":");
};

exports.ProduktFormatDate = (date) => {
    var d = new Date(date),
        month = "" + (d.getMonth() + 1),
        day = "" + d.getDate(),
        year = d.getFullYear(),
        hour = "" + d.getHours(),
        minute = "" + d.getMinutes();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    if (hour.length < 2) hour = "0" + hour;
    if (minute.length < 2) minute = "0" + minute;

    return [year, month, day].join(".") + " " + [hour, minute].join(":");
};

exports.ProduktDMYFormatDate = (date) => {
    var d = new Date(date),
        month = "" + (d.getMonth() + 1),
        day = "" + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [day, month, year].join(".");
};

exports.AngeboteformatDate = (date) => {
    var d = new Date(date),
        month = "" + (d.getMonth() + 1),
        day = "" + d.getDate(),
        year = d.getFullYear(),
        hour = "" + d.getHours(),
        minute = "" + d.getMinutes();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    if (hour.length < 2) hour = "0" + hour;
    if (minute.length < 2) minute = "0" + minute;

    return [day, month, year].join("-") + " " + [hour, minute].join(":");
};

exports.PreishistorieformatDate = (date) => {
    var d = new Date(date),
        month = "" + (d.getMonth() + 1),
        day = "" + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [year, month, day].join("-");
};

exports.getStaticDateTime = () => {
    var d = new Date(),
        month = "" + (d.getMonth() + 1),
        day = "" + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    return [year, month, day].join("-") + " 09:00:00";
};

exports.numberFormat = (value, fix) => {
    return Number(value)
        .toFixed(fix)
        .replace(",", ".")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

exports.stripHtmlTags = (value) => {
    return value.replace(/(<([^>]+)>)/gi, "");
};

exports.getRandomThree = (arrayData) => {
    return [
        arrayData[Math.floor(Math.random() * arrayData.length)],
        arrayData[Math.floor(Math.random() * arrayData.length)],
        arrayData[Math.floor(Math.random() * arrayData.length)],
    ];
};

exports.shuffle = (array) => {
    var currentIndex = array.length,
        temporaryValue,
        randomIndex;

    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
};

exports.replaceArray = (value, originArray, newArray) => {
    const len = originArray.length;

    for (let i = 0; i < originArray.length; i++) {
        const originV = originArray[i];
        const newV = newArray[i];
        value = value.replace(RegExp(originV, "g"), newV);
    }

    return value;
};

exports.nl2br = (str, is_xhtml) => {
    if (typeof str === "undefined" || str === null) {
        return "";
    }
    var breakTag = is_xhtml || typeof is_xhtml === "undefined" ? "<br />" : "<br>";
    return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, "$1" + breakTag + "$2");
};

exports.htmlEntities = (str) => {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/[\u00A0-\u9999<>\&]/g, function (i) {
            return "&#" + i.charCodeAt(0) + ";";
        });
};

exports.addcslashes = (str, charlist) => {
    // %  note 1: We show double backslashes in the return value example code below because a JavaScript string will not
    // %  note 1: render them as backslashes otherwise
    // *     example 1: addcslashes('foo[ ]', 'A..z'); // Escape all ASCII within capital A to lower z range, including square brackets
    // *     returns 1: "\\f\\o\\o\\[ \\]"
    // *     example 2: addcslashes("zoo['.']", 'z..A'); // Only escape z, period, and A here since not a lower-to-higher range
    // *     returns 2: "\\zoo['\\.']"
    // *     example 3: addcslashes("@a\u0000\u0010\u00A9", "\0..\37!@\177..\377") == '\\@a\\000\\020\\302\\251'); // Escape as octals those specified and less than 32 (0x20) or greater than 126 (0x7E), but not otherwise
    // *     returns 3: true
    // *     example 4: addcslashes("\u0020\u007E", "\40..\175") == '\\ ~'); // Those between 32 (0x20 or 040) and 126 (0x7E or 0176) decimal value will be backslashed if specified (not octalized)
    // *     returns 4: true
    // *     example 5: addcslashes("\r\u0007\n", '\0..\37'); // Recognize C escape sequences if specified
    // *     returns 5: "\\r\\a\\n"
    // *     example 6: addcslashes("\r\u0007\n", '\0'); // Do not recognize C escape sequences if not specified
    // *     returns 7: "\r\u0007\n"
    var target = "",
        chrs = [],
        i = 0,
        j = 0,
        c = "",
        next = "",
        rangeBegin = "",
        rangeEnd = "",
        chr = "",
        begin = 0,
        end = 0,
        octalLength = 0,
        postOctalPos = 0,
        cca = 0,
        escHexGrp = [],
        encoded = "",
        percentHex = /%([\dA-Fa-f]+)/g;
    var _pad = function (n, c) {
        if ((n = n + "").length < c) {
            return new Array(++c - n.length).join("0") + n;
        }
        return n;
    };

    for (i = 0; i < charlist.length; i++) {
        c = charlist.charAt(i);
        next = charlist.charAt(i + 1);
        if (c === "\\" && next && /\d/.test(next)) {
            // Octal
            rangeBegin = charlist.slice(i + 1).match(/^\d+/)[0];
            octalLength = rangeBegin.length;
            postOctalPos = i + octalLength + 1;
            if (charlist.charAt(postOctalPos) + charlist.charAt(postOctalPos + 1) === "..") {
                // Octal begins range
                begin = rangeBegin.charCodeAt(0);
                if (/\\\d/.test(charlist.charAt(postOctalPos + 2) + charlist.charAt(postOctalPos + 3))) {
                    // Range ends with octal
                    rangeEnd = charlist.slice(postOctalPos + 3).match(/^\d+/)[0];
                    i += 1; // Skip range end backslash
                } else if (charlist.charAt(postOctalPos + 2)) {
                    // Range ends with character
                    rangeEnd = charlist.charAt(postOctalPos + 2);
                } else {
                    throw "Range with no end point";
                }
                end = rangeEnd.charCodeAt(0);
                if (end > begin) {
                    // Treat as a range
                    for (j = begin; j <= end; j++) {
                        chrs.push(String.fromCharCode(j));
                    }
                } else {
                    // Supposed to treat period, begin and end as individual characters only, not a range
                    chrs.push(".", rangeBegin, rangeEnd);
                }
                i += rangeEnd.length + 2; // Skip dots and range end (already skipped range end backslash if present)
            } else {
                // Octal is by itself
                chr = String.fromCharCode(parseInt(rangeBegin, 8));
                chrs.push(chr);
            }
            i += octalLength; // Skip range begin
        } else if (next + charlist.charAt(i + 2) === "..") {
            // Character begins range
            rangeBegin = c;
            begin = rangeBegin.charCodeAt(0);
            if (/\\\d/.test(charlist.charAt(i + 3) + charlist.charAt(i + 4))) {
                // Range ends with octal
                rangeEnd = charlist.slice(i + 4).match(/^\d+/)[0];
                i += 1; // Skip range end backslash
            } else if (charlist.charAt(i + 3)) {
                // Range ends with character
                rangeEnd = charlist.charAt(i + 3);
            } else {
                throw "Range with no end point";
            }
            end = rangeEnd.charCodeAt(0);
            if (end > begin) {
                // Treat as a range
                for (j = begin; j <= end; j++) {
                    chrs.push(String.fromCharCode(j));
                }
            } else {
                // Supposed to treat period, begin and end as individual characters only, not a range
                chrs.push(".", rangeBegin, rangeEnd);
            }
            i += rangeEnd.length + 2; // Skip dots and range end (already skipped range end backslash if present)
        } else {
            // Character is by itself
            chrs.push(c);
        }
    }

    for (i = 0; i < str.length; i++) {
        c = str.charAt(i);
        if (chrs.indexOf(c) !== -1) {
            target += "\\";
            cca = c.charCodeAt(0);
            if (cca < 32 || cca > 126) {
                // Needs special escaping
                switch (c) {
                    case "\n":
                        target += "n";
                        break;
                    case "\t":
                        target += "t";
                        break;
                    case "\u000D":
                        target += "r";
                        break;
                    case "\u0007":
                        target += "a";
                        break;
                    case "\v":
                        target += "v";
                        break;
                    case "\b":
                        target += "b";
                        break;
                    case "\f":
                        target += "f";
                        break;
                    default:
                        //target += _pad(cca.toString(8), 3);break; // Sufficient for UTF-16
                        encoded = encodeURIComponent(c);

                        // 3-length-padded UTF-8 octets
                        if ((escHexGrp = percentHex.exec(encoded)) !== null) {
                            target += _pad(parseInt(escHexGrp[1], 16).toString(8), 3); // already added a slash above
                        }
                        while ((escHexGrp = percentHex.exec(encoded)) !== null) {
                            target += "\\" + _pad(parseInt(escHexGrp[1], 16).toString(8), 3);
                        }
                        break;
                }
            } else {
                // Perform regular backslashed escaping
                target += c;
            }
        } else {
            // Just add the character unescaped
            target += c;
        }
    }
    return target;
};

exports.roundDecimail = (num, precision) => {
    precision = Math.pow(10, precision);
    return Math.round(num * precision) / precision;
};

exports.arraysEqual = (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

exports.validURL = (str) => {
    var pattern = new RegExp(
        "^(https?:\\/\\/)?" + // protocol
            "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
            "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
            "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
            "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
            "(\\#[-a-z\\d_]*)?$",
        "i"
    ); // fragment locator
    return !!pattern.test(str);
};

exports.validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

exports.isNumeric = (str) => {
    if (typeof str != "string") return false;
    return !isNaN(str) && !isNaN(parseFloat(str));
};

exports.microtime = (getAsFloat) => {
    var s,
        now = (Date.now ? Date.now() : new Date().getTime()) / 1000;

    if (getAsFloat) {
        return now;
    }

    s = now | 0;

    return Math.round((now - s) * 1000) / 1000 + " " + s;
};

exports.manURLEncode = (man) => {
    man = man.toLowerCase();
    const suche = ["ä", "ö", "ü", " ", "&", ".", "+", ":", "!", "²", "(", ")", "[", "]", ",", "®", "@", "é", "ô", "=", "#", "ß", "_", "/", "\\"];
    const ersetze = ["ae", "oe", "ue", "-", "-", "-", "-", "", "", "", "", "", "", "", "-", "", "a", "e", "o", "-", "", "ss", "-", "", ""];

    man = this.replaceArray(man, suche, ersetze);

    return man;
};

exports.array_pad = (input, padSize, padValue) => {
    let pad = [];
    const newArray = [];
    let newLength;
    let diff = 0;
    let i = 0;
    if (Object.prototype.toString.call(input) === "[object Array]" && !isNaN(padSize)) {
        newLength = padSize < 0 ? padSize * -1 : padSize;
        diff = newLength - input.length;
        if (diff > 0) {
            for (i = 0; i < diff; i++) {
                newArray[i] = padValue;
            }
            pad = padSize < 0 ? newArray.concat(input) : input.concat(newArray);
        } else {
            pad = input;
        }
    }
    return pad;
};

exports.array_diff = (a1, a2) => {
    var a = [],
        diff = [];

    for (var i = 0; i < a1.length; i++) {
        a[a1[i]] = true;
    }

    for (var i = 0; i < a2.length; i++) {
        if (a[a2[i]]) {
            delete a[a2[i]];
        } else {
            a[a2[i]] = true;
        }
    }

    for (var k in a) {
        diff.push(k);
    }

    return diff;
};

exports.array_map = (callback) => {
    const argc = arguments.length;
    const argv = arguments;
    let obj = null;
    let cb = callback;
    const j = argv[1].length;
    let i = 0;
    let k = 1;
    let m = 0;
    let tmp = [];
    const tmpArr = [];
    const $global = typeof window !== "undefined" ? window : global;
    while (i < j) {
        while (k < argc) {
            tmp[m++] = argv[k++][i];
        }
        m = 0;
        k = 1;
        if (callback) {
            if (typeof callback === "string") {
                cb = $global[callback];
            } else if (typeof callback === "object" && callback.length) {
                obj = typeof callback[0] === "string" ? $global[callback[0]] : callback[0];
                if (typeof obj === "undefined") {
                    throw new Error("Object not found: " + callback[0]);
                }
                cb = typeof callback[1] === "string" ? obj[callback[1]] : callback[1];
            }
            tmpArr[i++] = cb.apply(obj, tmp);
        } else {
            tmpArr[i++] = tmp;
        }
        tmp = [];
    }
    return tmpArr;
};

exports.reset = (arr) => {
    const $global = typeof window !== "undefined" ? window : global;
    $global.$locutus = $global.$locutus || {};
    const $locutus = $global.$locutus;
    $locutus.php = $locutus.php || {};
    $locutus.php.pointers = $locutus.php.pointers || [];
    const pointers = $locutus.php.pointers;
    const indexOf = function (value) {
        for (let i = 0, length = this.length; i < length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    };
    if (!pointers.indexOf) {
        pointers.indexOf = indexOf;
    }
    if (pointers.indexOf(arr) === -1) {
        pointers.push(arr, 0);
    }
    const arrpos = pointers.indexOf(arr);
    if (Object.prototype.toString.call(arr) !== "[object Array]") {
        for (const k in arr) {
            if (pointers.indexOf(arr) === -1) {
                pointers.push(arr, 0);
            } else {
                pointers[arrpos + 1] = 0;
            }
            return arr[k];
        }

        return false;
    }
    if (arr.length === 0) {
        return false;
    }
    pointers[arrpos + 1] = 0;
    return arr[pointers[arrpos + 1]];
};

exports.mb_substr_replace = (string, replacement, start, length = null) => {
    if (Array.isArray(string)) {
        const num = string.length;

        replacement = Array.isArray(replacement) ? replacement.slice(0, num) : this.array_pad(Array(replacement), num, replacement);
        if (Array.isArray(start)) {
            start = start.slice(start, 0, num);
            for (const [key, value] of Object.entries(start)) {
                start[key] = Number.isInteger(value) ? value : 0;
            }
        } else {
            start = this.array_pad(Array(start), num, start);
        }

        if (!length) {
            length = Array(num).fill(0);
        } else if (Array.isArray(length)) {
            length = length.slice(0, num);
            for (const [key, value] of Object.values(length)) {
                length[key] = value ? (Number.isInteger(value) ? value : num) : 0;
            }
        } else {
            length = this.array_pad(Array(length), num, length);
        }

        return this.array_map(this.mb_substr_replace, string, replacement, start, length);
    }

    const smatches = string.toString().match(/./g);
    const rmatches = replacement.toString().match(/./g);
    if (length === null) length = string.length;
    smatches[0].splice(start, length, rmatches[0]);
    return smatches[0].join("");
};

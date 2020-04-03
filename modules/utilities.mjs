function mod(m, n) {
    return (m % n + n) % n;
}

var ARROWS = {
    "N": "↑",
    "E": "→",
    "W": "←",
    "S": "↓"
}

export {mod, ARROWS}
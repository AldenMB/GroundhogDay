function mod(m, n) {
    return (m % n + n) % n;
}

const ARROWS = {
    "N": "↑",
    "E": "→",
    "W": "←",
    "S": "↓"
}

export {mod, ARROWS}
class CustomMath {
    static round5(int) {
        int = Math.round(parseInt(int));

        if (int % 5 == 0) {
            return int;
        }

        if (int % 10 < 3) {
            int -= int % 10;
            return int;
        }

        if (int % 10 > 7) {
            int -= int % 10;
            return int + 10;
        }

        int -= int % 10;
        return int + 5;
    }
}

module.exports = CustomMath;

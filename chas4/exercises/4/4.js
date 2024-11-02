var Color;
(function (Color) {
    Color["Red"] = "Red";
    Color["Green"] = "Green";
    Color["Blue"] = "Blue";
    Color["Yellow"] = "Yellow";
    Color["Orange"] = "Orange";
})(Color || (Color = {}));
function getColorMessage(color) {
    switch (color) {
        case Color.Red:
            return 'You selected Red!';
        case Color.Green:
            return 'You selected Green!';
        case Color.Blue:
            return 'You selected Blue!';
        case Color.Yellow:
            return 'You selected Yellow!';
        case Color.Orange:
            return 'You selected Orange!';
        default:
            return 'Uknown color!';
    }
}
var selectedColor = Color.Orange;
console.log(getColorMessage(selectedColor));

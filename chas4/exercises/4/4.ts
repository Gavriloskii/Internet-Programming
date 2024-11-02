enum Color{
    Red = 'Red',
    Green = 'Green',
    Blue = 'Blue',
    Yellow = 'Yellow',
    Orange = 'Orange'
}
function getColorMessage(color: Color): string{
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
const selectedColor: Color = Color.Orange;
console.log(getColorMessage(selectedColor));
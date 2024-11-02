export function capitalize(input: string) : string {
    return input.charAt(0).toUpperCase() + input.slice(1);
}

export function reverse(input: string) : string {
    return input.split('').reverse().join('');
}
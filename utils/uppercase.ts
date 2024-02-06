const uppercase = <T extends string>(string: T) => string.toUpperCase() as Uppercase<T>;

export default uppercase;

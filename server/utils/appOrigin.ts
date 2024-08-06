import domain from "@exactly/common/domain";

export default domain === "localhost" ? "http://localhost:8081" : `https://${domain}`;

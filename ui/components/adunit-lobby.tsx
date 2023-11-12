import { FunctionComponent } from "react";

const AdUnitLobby: FunctionComponent = () => {
    return (
        <>
            <div className="lg:max-w-[280px] w-[87vw] h-[300px] lg:h-[65vh] fixed mx-2">
                <ins
                    className="adsbygoogle"
                    style={{ display: "block" }}
                    data-ad-client="ca-pub-4166003434222987"
                    data-ad-slot="9938509129"
                    data-ad-format="auto"
                    data-full-width-responsive="true"
                ></ins>
            </div>

            <script
                dangerouslySetInnerHTML={{
                    __html: "(adsbygoogle = window.adsbygoogle || []).push({});",
                }}
            ></script>
        </>
    );
};

export default AdUnitLobby;

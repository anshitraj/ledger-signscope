import { useState } from "react";
import { useParseIntent } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function IntentLab() {
  const [text, setText] = useState("Pay 25 USDC to Alice for invoice INV-102");
  
  const parseIntent = useParseIntent();
  const result = parseIntent.data;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    parseIntent.mutate({ data: { text } });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-4xl"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-primary" />
          Intent Lab
        </h1>
        <p className="text-muted-foreground">
          Test the natural language parser. See how raw user requests are converted into structured transaction intent.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle>Raw Input</CardTitle>
            <CardDescription>Enter a natural language request</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[150px] resize-none font-mono text-sm bg-muted/20"
                placeholder="E.g., Send 10 ETH to bob.eth..."
              />
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90" 
                disabled={parseIntent.isPending || !text.trim()}
              >
                {parseIntent.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Parsing...</>
                ) : (
                  <><ArrowRight className="w-4 h-4 mr-2" /> Parse Intent</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Structured Output</CardTitle>
                <CardDescription>Extracted transaction parameters</CardDescription>
              </div>
              {result && (
                <Badge variant="outline" className={result.confidence > 0.8 ? "text-secondary border-secondary/50 bg-secondary/10" : "text-yellow-600 border-yellow-500/50 bg-yellow-500/10"}>
                  {(result.confidence * 100).toFixed(0)}% Confidence
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {parseIntent.isPending ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : result ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Recipient</span>
                    <div className="font-mono text-sm p-2 bg-muted rounded border">{result.recipientName || "None"}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Asset</span>
                    <div className="font-mono text-sm p-2 bg-muted rounded border">{result.asset || "None"}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Amount</span>
                    <div className="font-mono text-sm p-2 bg-muted rounded border">{result.amount ?? "None"}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Chain</span>
                    <div className="font-mono text-sm p-2 bg-muted rounded border">{result.chain}</div>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Invoice ID</span>
                    <div className="font-mono text-sm p-2 bg-muted rounded border">{result.invoiceId || "None"}</div>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Confidence Score</span>
                    <span className="font-mono">{result.confidence * 100}%</span>
                  </div>
                  <Progress value={result.confidence * 100} className="h-2" />
                </div>
              </motion.div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-lg border-muted">
                <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                Submit text to see parsed intent
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
